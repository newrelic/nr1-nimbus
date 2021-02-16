/* eslint
no-console: 0,
no-async-promise-executor: 0
*/

import { getEntityCollection, isCloudLabel } from '../../shared/lib/utils';
import { NrqlQuery } from 'nr1';

export const decorateDatacenterData = async workload => {
  const dcDoc = await getEntityCollection('dcDoc', workload.guid);
  const doc = ((dcDoc || {})[0] || {}).document || null;

  const costTotal = { value: 0 };

  if (doc && doc.costs) {
    Object.keys(doc.costs).forEach(key => {
      if (!costTotal[key]) costTotal[key] = 0;
      doc.costs[key].forEach(cost => {
        const finalCost = cost.units * cost.rate * (12 / cost.recurringMonths);
        costTotal.value += finalCost;
        costTotal[key] += finalCost;
      });
    });
  }

  let totalCU = 0;

  if (workload.data && workload.data.entityData) {
    workload.data.entityData.forEach(entity => {
      let systemSample = entity.systemSample.results[0];
      // check vsphere vm sample
      if (!systemSample['latest.entityGuid']) {
        systemSample = entity.vsphereVmSample.results[0];
      }
      totalCU +=
        systemSample['latest.coreCount'] +
        systemSample['latest.memoryTotalBytes'] * 1e-9; // BYTES TO GB
    });
  }

  return { dcDoc, costTotal, totalCU };
};

export const getKeySets = accountIds => {
  return new Promise(resolve => {
    const keysetByAccount = {};

    const keySetPromises = accountIds.map(id =>
      NrqlQuery.query({
        accountId: id,
        query: 'SELECT keyset() FROM SystemSample',
        formatType: NrqlQuery.FORMAT_TYPE.RAW
      })
    );

    Promise.all(keySetPromises).then(values => {
      values.forEach((value, i) => {
        keysetByAccount[
          accountIds[i]
        ] = value.data.raw.results[0].allKeys.filter(isCloudLabel);
      });
      resolve(keysetByAccount);
    });
  });
};

export const getInstanceCost = (
  entity,
  cloudPrices,
  datacenterCostPerCU,
  targetCloud,
  targetCloudRegion,
  optimizationConfig
) => {
  return new Promise(async resolve => {
    const tempEntity = { ...entity };

    let systemSample =
      (((entity || {}).systemSample || {}).results || {})[0] || null;

    // check if vsphere vm
    if (!systemSample || !systemSample['latest.entityGuid']) {
      systemSample =
        (((entity || {}).vsphereVmSample || {}).results || {})[0] || null;
    }

    if (systemSample && systemSample['latest.entityGuid']) {
      const coreCount = systemSample['latest.coreCount'];
      const memoryGB = systemSample['latest.memoryTotalBytes'] * 1e-9;

      if (systemSample['latest.awsRegion']) {
        tempEntity.instanceResult = await getInstancePrice(
          'amazon',
          systemSample['latest.instanceType'],
          systemSample['latest.awsRegion'],
          cloudPrices,
          optimizationConfig
        );
        // console.log(tempEntity.instanceResult);
      } else if (systemSample['latest.zone']) {
        // gcp
        tempEntity.instanceResult = await getInstancePrice(
          systemSample['latest.instanceType'],
          systemSample['latest.zone'],
          cloudPrices,
          optimizationConfig
        );
      } else if (systemSample['latest.regionName']) {
        tempEntity.instanceResult = await getInstancePrice(
          'azure',
          systemSample['latest.instanceType'],
          systemSample['latest.regionName'],
          cloudPrices,
          optimizationConfig
        );
      } else if (datacenterCostPerCU) {
        const instanceCU = Math.round(memoryGB + coreCount);
        tempEntity.CU = instanceCU;
        tempEntity.DatacenterCUCost = instanceCU * datacenterCostPerCU;
      }

      if (
        !systemSample['latest.zone'] &&
        !systemSample['latest.regionName'] &&
        !systemSample['latest.awsRegion']
      ) {
        tempEntity.matchedInstances = getCloudInstances(
          optimizationConfig,
          coreCount,
          Math.round(memoryGB),
          targetCloud,
          targetCloudRegion,
          cloudPrices
        );
      }

      if (!optimizationConfig || !optimizationConfig.enable) {
        tempEntity.optimizedData = null;
      } else {
        tempEntity.optimizedData = getOptimizedMatches(
          tempEntity.instanceResult,
          systemSample,
          optimizationConfig,
          targetCloud,
          targetCloudRegion,
          cloudPrices
        );
        // console.log(tempEntity.optimizedData);
      }
    }

    resolve(tempEntity);
  });
};

export const getOptimizedMatches = (
  instanceResult,
  systemSample,
  optimizationConfig,
  targetCloud,
  targetCloudRegion,
  cloudPrices
) => {
  // if (!optimizationConfig || !optimizationConfig.enable) return null;

  const optimizationData = {};
  const maxCpu = systemSample['max.cpuPercent'];
  const maxMem = systemSample['max.memoryPercent'];

  // assess inclusion period
  const timeSinceLastReported =
    new Date().getTime() - systemSample['latest.timestamp'];
  if (
    timeSinceLastReported >
    parseFloat(optimizationConfig.inclusionPeriodHours || 0) * 3600000
  ) {
    return { state: 'excluded' };
  }

  // assess staleness params
  const cpuStale =
    optimizationConfig.staleCpu !== 0 && maxCpu < optimizationConfig.staleCpu;

  const memStale =
    optimizationConfig.staleCpu !== 0 && maxMem < optimizationConfig.staleMem;

  const cpuMemUpperStaleOperator =
    optimizationConfig.cpuMemUpperStaleOperator || 'AND';

  if (
    (cpuMemUpperStaleOperator === 'AND' && cpuStale && memStale) ||
    (cpuMemUpperStaleOperator === 'OR' && (cpuStale || memStale))
  ) {
    return { state: 'stale' };
  }

  // optimize
  // assess upper limit params
  const cpuOptimize =
    optimizationConfig.cpuUpper !== 0 && maxCpu < optimizationConfig.cpuUpper;

  const memOptimize =
    optimizationConfig.memUpper !== 0 && maxMem < optimizationConfig.memUpper;

  const cpuMemUpperOperator = optimizationConfig.cpuMemUpperOperator || 'AND';

  // console.log(
  //   cpuOptimize,
  //   memOptimize,
  //   cpuMemUpperOperator,
  //   maxCpu,
  //   optimizationConfig.cpuUpper,
  //   maxMem,
  //   optimizationConfig.memUpper
  // );

  if (
    (cpuMemUpperOperator === 'AND' && cpuOptimize && memOptimize) ||
    (cpuMemUpperOperator === 'OR' && (cpuOptimize || memOptimize))
  ) {
    // optimize
    let cpuCount = 0;
    let memGb = 0;
    if (instanceResult) {
      cpuCount = instanceResult.cpusPerVm;
      memGb = instanceResult.memPerVm;
    } else {
      cpuCount = systemSample['latest.coreCount'];
      memGb = systemSample['latest.memoryTotalBytes'] * 1e-9;
    }

    cpuCount = roundHalf(cpuCount * optimizationConfig.cpuRightSize);
    memGb = roundHalf(memGb * optimizationConfig.cpuRightSize);

    optimizationData.matchedInstances = getCloudInstances(
      optimizationConfig,
      cpuCount,
      memGb,
      targetCloud,
      targetCloudRegion,
      cloudPrices
    );

    if (optimizationData.matchedInstances) {
      if (
        Object.keys(optimizationData.matchedInstances.exactMatchedProducts)
          .length > 0
      ) {
        optimizationData.state = 'optimized-exact';
      } else if (
        Object.keys(optimizationData.matchedInstances.nextMatchedProducts)
          .length > 0
      ) {
        optimizationData.state = 'optimized-next';
      }
    }
  }

  return optimizationData;
};

export const roundHalf = num => {
  return num < 0.5 ? 0.5 : Math.round(num * 2) / 2;
};

export const getInstancePrice = (
  cloud,
  instanceType,
  region,
  cloudPrices
  // optimizationConfig
) => {
  return new Promise(async resolve => {
    const pricing = cloudPrices[cloud][region];
    if (pricing) {
      for (let z = 0; z < (pricing.products || []).length; z++) {
        if (pricing.products[z].type === instanceType) {
          resolve(pricing.products[z]);
        }
      }
    }

    // unable to find, resolve null
    resolve(null);
  });
};

// get cloud instance based on cpu, mem
export const getCloudInstances = (
  optimizationConfig,
  cpu,
  mem,
  cloud,
  region,
  cloudPrices
) => {
  if (cloudPrices[cloud]) {
    const products = cloudPrices[cloud][region].products;

    const exactMatchedProducts = {};
    for (let z = 0; z < products.length; z++) {
      if (!exactMatchedProducts[products[z].category]) {
        exactMatchedProducts[products[z].category] = null;
      }

      if (checkIncludeExclude(optimizationConfig, products[z])) {
        break;
      }

      if (products[z].cpusPerVm === cpu && products[z].memPerVm === mem) {
        exactMatchedProducts[products[z].category] = products[z];
      }
    }

    const nextMatchedProducts = {};

    // get cheapest from each missing price category
    Object.keys(exactMatchedProducts).forEach(category => {
      if (!exactMatchedProducts[category]) {
        for (let z = 0; z < products.length; z++) {
          if (checkIncludeExclude(optimizationConfig, products[z])) {
            break;
          }

          if (
            products[z].category === category &&
            products[z].cpusPerVm >= cpu &&
            products[z].memPerVm >= mem
          ) {
            nextMatchedProducts[category] = products[z];
            break;
          }
        }
        delete exactMatchedProducts[category];
      }
    });

    const matchedInstances = { exactMatchedProducts, nextMatchedProducts };

    return matchedInstances;
  }
};

// check the include exclude filters, and return true if we need to skip this product
export const checkIncludeExclude = (config, product) => {
  if (config && config.enable) {
    // skip excluded instances
    if (config.excludedInstanceTypes) {
      for (let y = 0; y < config.excludedInstanceTypes.length; y++) {
        if (product.type.includes(config.excludedInstanceTypes[y].value)) {
          return true;
        }
      }
    }
    // only keep included instances
    if (
      config.includedInstanceTypes &&
      config.includedInstanceTypes.length > 0
    ) {
      let isIncluded = false;
      for (let y = 0; y < config.includedInstanceTypes.length; y++) {
        if (product.type.includes(config.includedInstanceTypes[y].value)) {
          isIncluded = true;
        }
      }

      if (!isIncluded) return true;
    }
  }

  return false;
};

export const adjustCostValue = (period, value) => {
  switch (period) {
    case 'D':
      value = value * 24;
      break;
    case 'M':
      value = value * 24 * 30;
      break;
    case 'Y':
      value = value * 24 * 30 * 12;
      break;
  }
  return parseFloat(value);
};

export const getCloudRegions = async clouds => {
  const cloudRegions = {};

  const fetchPromises = clouds.map(cloud =>
    fetch(
      `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/${cloud}/regions.json`
    )
  );

  const jsonPromises = await Promise.all(fetchPromises).then(async values =>
    values.map(value => value.json())
  );

  const responseValues = await Promise.all(jsonPromises).then(
    responseValues => responseValues
  );

  responseValues.forEach((value, i) => {
    cloudRegions[clouds[i]] = value;
  });

  return cloudRegions;
};

export const buildTags = (currentTags, newTags) => {
  newTags.forEach(tag => {
    currentTags.push(`${tag.key}:${tag.values[0]}`);
  });
  return [...new Set(currentTags)].sort();
};
