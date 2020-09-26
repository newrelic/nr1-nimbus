/* eslint 
no-use-before-define: 0,
no-async-promise-executor: 0
*/ // --> OFF
import {
  NerdGraphQuery,
  UserStorageQuery,
  UserStorageMutation,
  AccountStorageQuery,
  AccountStorageMutation,
  EntityStorageQuery,
  EntityStorageMutation,
  NerdGraphMutation
} from 'nr1';
import { gqlNrqlQuery, deleteAllTagsQuery } from './queries';
import gql from 'graphql-tag';
import { toast } from 'react-toastify';

toast.configure();

const fakeInstance = (state, cost) => ({
  category: state,
  type: state,
  onDemandPrice: cost || 0,
  cpusPerVm: 0,
  memPerVm: 0,
  attributes: { cpu: '0', instanceTypeCategory: state, memory: '0' }
});

export const nerdGraphQuery = async query => {
  const nerdGraphData = await NerdGraphQuery.query({
    query: gql`
      ${query}
    `
  });
  return nerdGraphData.data;
};

export const getUserCollection = async (collection, documentId) => {
  const payload = { collection };
  if (documentId) payload.documentId = documentId;
  const result = await UserStorageQuery.query(payload);
  const collectionResult = (result || {}).data || [];
  return collectionResult;
};

export const getAccountCollection = async (
  accountId,
  collection,
  documentId
) => {
  const payload = { collection };
  payload.accountId = accountId;
  if (documentId) payload.documentId = documentId;
  const result = await AccountStorageQuery.query(payload);
  const collectionResult = (result || {}).data || [];
  return collectionResult;
};

export const writeUserDocument = async (collection, documentId, payload) => {
  const result = await UserStorageMutation.mutate({
    actionType: UserStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
    collection,
    documentId,
    document: payload
  });
  return result;
};

export const getEntityCollection = async (collection, guid, documentId) => {
  const payload = { collection };
  payload.entityGuid = guid;
  if (documentId) payload.documentId = documentId;
  const result = await EntityStorageQuery.query(payload);
  const collectionResult = (result || {}).data || (documentId ? null : []);
  return collectionResult;
};

export const writeEntityDocument = async (
  guid,
  collection,
  documentId,
  payload
) => {
  const result = await EntityStorageMutation.mutate({
    entityGuid: guid,
    actionType: EntityStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
    collection,
    documentId,
    document: payload
  });
  return result;
};

export const deleteEntityDocument = async (guid, collection, documentId) => {
  const deletePayload = {
    entityGuid: guid,
    actionType: EntityStorageMutation.ACTION_TYPE.DELETE_COLLECTION,
    collection
  };
  if (documentId) {
    deletePayload.documentId = documentId;
    deletePayload.actionType =
      EntityStorageMutation.ACTION_TYPE.DELETE_DOCUMENT;
  }
  const result = await EntityStorageMutation.mutate(deletePayload);
  return result;
};

export const writeAccountDocument = async (
  accountId,
  collection,
  documentId,
  payload
) => {
  const result = await AccountStorageMutation.mutate({
    accountId,
    actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
    collection,
    documentId,
    document: payload
  });
  return result;
};

export const deleteUserDocument = async (collection, documentId) => {
  const result = await UserStorageMutation.mutate({
    actionType: UserStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
    collection,
    documentId
  });
  return result;
};

export const deleteAccountDocument = async (collection, documentId) => {
  const result = await AccountStorageMutation.mutate({
    actionType: AccountStorageMutation.ACTION_TYPE.DELETE_DOCUMENT,
    collection,
    documentId
  });
  return result;
};

// may remove in favor of direct nrql query component
export const nrdbQuery = async (accountId, query, timeout) => {
  const q = gqlNrqlQuery(accountId, query, timeout);
  const result = await NerdGraphQuery.query({ query: q });
  const nrqlResult =
    (((((result || {}).data || {}).actor || {}).account || {}).nrql || {})
      .results || [];
  return nrqlResult;
};

export const isCloudLabel = attributeName => /label\..+/.test(attributeName);

export const getTagValue = (tags, tag) => {
  if (tags) {
    for (let z = 0; z < tags.length; z++) {
      if (tags[z].key === tag) {
        if (tags[z].values.length === 1) {
          return tags[z].values[0];
        } else {
          return tags[z].values;
        }
      }
    }
  }
  return null;
};

export const tagFilterWorkloads = (workloads, tags) => {
  // if all tags false, return all workloads
  let noTags = 0;
  let falseTags = 0;
  Object.keys(tags).forEach(group => {
    Object.keys(tags[group]).forEach(item => {
      noTags++;
      if (tags[group][item] === false) falseTags++;
    });
  });

  if (noTags === falseTags) return workloads;

  // check for enabled tags and return workload if it exists
  return workloads.filter(wl => {
    for (let z = 0; z < Object.keys(tags).length; z++) {
      const group = Object.keys(tags)[z];
      for (let y = 0; y < Object.keys(tags[group]).length; y++) {
        const item = Object.keys(tags[group])[y];
        const value = tags[group][item];
        if (value) {
          if (getTagValue(wl.tags, group) === item) {
            return true;
          }
        }
      }
    }

    return false;
  });
};

export const deleteWorkload = (workload, deleteSource) => {
  return new Promise(async resolve => {
    toast.info('Deleting workload...', {
      autoClose: false,
      containerId: 'B',
      toastId: 'deleteWorkload'
    });

    const actions = [];
    let message = '';

    let srcWorkloadGuid = getTagValue(workload.tags, 'srcWorkloadGuid');
    let tgtWorkloadGuid = getTagValue(workload.tags, 'tgtWorkloadGuid');

    // if found the incoming workload is a target workload
    if (srcWorkloadGuid) {
      tgtWorkloadGuid = workload.guid;
      actions.push(
        NerdGraphMutation.mutate({
          mutation: `mutation {
            workloadDelete(guid: "${tgtWorkloadGuid}") {
              name
            }
          }`
        })
      );
      if (deleteSource) {
        actions.push(
          NerdGraphMutation.mutate({
            mutation: `mutation {
              workloadDelete(guid: "${srcWorkloadGuid}") {
                name
              }
            }`
          })
        );
      } else {
        actions.push(
          NerdGraphMutation.mutate({
            mutation: deleteAllTagsQuery(srcWorkloadGuid)
          })
        );
      }
      message = 'Deleted migration workload.';
    } else if (tgtWorkloadGuid) {
      // if found the incoming workload is a source workload
      srcWorkloadGuid = workload.guid;
      actions.push(
        NerdGraphMutation.mutate({
          mutation: `mutation {
            workloadDelete(guid: "${srcWorkloadGuid}") {
              name
            }
          }`
        })
      );
      actions.push(
        NerdGraphMutation.mutate({
          mutation: `mutation {
            workloadDelete(guid: "${tgtWorkloadGuid}") {
              name
            }
          }`
        })
      );
      message = 'Deleted migration workload.';
    } else if (!srcWorkloadGuid && !tgtWorkloadGuid) {
      // delete generic workload
      actions.push(
        NerdGraphMutation.mutate({
          mutation: `mutation {
            workloadDelete(guid: "${workload.guid}") {
              name
            }
          }`
        })
      );
      message = 'Deleted workload.';
    }

    const results = await Promise.all(actions);
    if (results) {
      toast.update('deleteWorkload', {
        render: message,
        type: toast.TYPE.SUCCESS,
        containerId: 'B',
        autoClose: 3000
      });
    }
    resolve();
  });
};

export const calculateMigrationData = (workloads, costPeriod) => {
  const migrationData = {
    noEntitiesSrc: 0,
    noEntitiesTgt: 0,
    guidsOnPremHostsSrc: [],
    guidsCloudHostsSrc: [],
    guidsOnPremHostsTgt: [],
    guidsCloudHostsTgt: [],
    storageBytesCloudSrc: 0,
    storageBytesOnPremSrc: 0,
    storageBytesCloudTgt: 0,
    storageBytesOnPremTgt: 0,
    entityProgress: { tgt: {}, src: {} },
    entityProgressNumeric: { tgt: {}, src: {} },
    costs: {
      totalProjectedCost: 0, // projected cost from pre migration to post migration
      totalCurrentCost: 0, // current cost pre migration
      totalProjectedSaving: 0, // delta between current pre cost, and projected cost
      totalCloudCostPost: 0, // total current cloud spend hourly post
      totalCloudCostPre: 0, // total current cloud spend hourly pre
      totalDatacenterCostPost: 0,
      totalDatacenterCostPre: 0,
      projectedCloudCost: 0
    }
  };

  // any workload with a src or tgt guid is part of a migration
  for (let z = 0; z < workloads.length; z++) {

    const srcWorkloadGuid = getTagValue(workloads[z].tags, 'srcWorkloadGuid');
    const tgtWorkloadGuid = getTagValue(workloads[z].tags, 'tgtWorkloadGuid');

    if (getTagValue(workloads[z].tags, 'm.MigrationId')) {
      addWorkloadMigration(
        workloads[z],
        migrationData,
        srcWorkloadGuid,
        tgtWorkloadGuid
      );
    }

    // build entityType Progress
    for (let y = 0; y < workloads[z].entities.length; y++) {
      if (
        !migrationData.entityProgress.src[workloads[z].entities[y].entityType]
      ) {
        migrationData.entityProgress.src[
          workloads[z].entities[y].entityType
        ] = [];
        migrationData.entityProgressNumeric.src[
          workloads[z].entities[y].entityType
        ] = 0;
      }
      if (
        !migrationData.entityProgress.tgt[workloads[z].entities[y].entityType]
      ) {
        migrationData.entityProgress.tgt[
          workloads[z].entities[y].entityType
        ] = [];
        migrationData.entityProgressNumeric.tgt[
          workloads[z].entities[y].entityType
        ] = 0;
      }

      if (srcWorkloadGuid) {
        migrationData.entityProgress.tgt[
          workloads[z].entities[y].entityType
        ].push(workloads[z].entities[y]);
        migrationData.entityProgressNumeric.tgt[
          workloads[z].entities[y].entityType
        ]++;
      } else if (tgtWorkloadGuid) {
        migrationData.entityProgress.src[
          workloads[z].entities[y].entityType
        ].push(workloads[z].entities[y]);
        migrationData.entityProgressNumeric.src[
          workloads[z].entities[y].entityType
        ]++;
      }
    }

    // calculate host info
    const entityData = ((workloads[z] || {}).data || {}).entityData || [];
    const optimizationConfig = (workloads[z] || {}).optimizationConfig || null;
    const optimizationConfigEnabled =
      (optimizationConfig || {}).enable || false;

    for (let z = 0; z < entityData.length; z++) {
      let systemSample =
        (((entityData[z] || {}).systemSample || {}).results || {})[0] || null;

      // if unavailable check vspherevm
      if (!systemSample || !systemSample['latest.entityGuid']) {
        systemSample =
          (((entityData[z] || {}).vsphereVmSample || {}).results || {})[0] ||
          null;
      }

      if (systemSample) {
        const isCloud =
          systemSample['latest.awsRegion'] ||
          systemSample['latest.regionName'] ||
          systemSample['latest.zone'] ||
          null;

        if (srcWorkloadGuid && systemSample['latest.entityGuid']) {
          // tgt
          if (isCloud) {
            migrationData.guidsCloudHostsTgt.push(
              systemSample['latest.entityGuid']
            );
            migrationData.storageBytesCloudTgt +=
              systemSample['latest.diskTotalBytes'];
          } else {
            migrationData.guidsOnPremHostsTgt.push(
              systemSample['latest.entityGuid']
            );
            migrationData.storageBytesOnPremTgt +=
              systemSample['latest.diskTotalBytes'];
          }
        } else if (tgtWorkloadGuid && systemSample['latest.entityGuid']) {
          // src

          let cheapestExactMatch = null;
          let cheapestNextMatch = null;

          // check if optimized config available and enabled
          if (optimizationConfigEnabled) {
            // check state if excluded or stale
            let state =
              ((entityData[z] || {}).optimizedData || {}).state || null;

            if (optimizationConfig) {
              if (
                optimizationConfig.excludedGuids.includes(
                  systemSample['latest.entityGuid']
                )
              ) {
                state = 'skip';
              }
            }

            if (state === 'excluded' || state === 'stale') {
              cheapestExactMatch = fakeInstance(state);
            } else if (state === null || state === 'skip') {
              // if state is null or skipped backfill existing cost
              cheapestExactMatch = getCheapestMatch(
                ((entityData[z] || {}).matchedInstances || {})
                  .exactMatchedProducts || {}
              );
              cheapestNextMatch = getCheapestMatch(
                ((entityData[z] || {}).matchedInstances || {})
                  .nextMatchedProducts || {}
              );

              if (cheapestExactMatch) {
                cheapestExactMatch = fakeInstance(
                  state,
                  cheapestExactMatch.onDemandPrice
                );
              } else if (cheapestNextMatch) {
                cheapestNextMatch = fakeInstance(
                  state,
                  cheapestNextMatch.onDemandPrice
                );
              }
            }

            if (
              state !== 'excluded' &&
              state !== 'stale' &&
              state !== null &&
              state !== 'skip'
            ) {
              // check if optimized match
              cheapestExactMatch = getCheapestMatch(
                (
                  ((entityData[z] || {}).optimizedData || {})
                    .matchedInstances || {}
                ).exactMatchedProducts || {}
              );
              cheapestNextMatch = getCheapestMatch(
                (
                  ((entityData[z] || {}).optimizedData || {})
                    .matchedInstances || {}
                ).nextMatchedProducts || {}
              );
            }
          } else {
            cheapestExactMatch = getCheapestMatch(
              ((entityData[z] || {}).matchedInstances || {})
                .exactMatchedProducts || {}
            );
            cheapestNextMatch = getCheapestMatch(
              ((entityData[z] || {}).matchedInstances || {})
                .nextMatchedProducts || {}
            );
          }

          if (cheapestExactMatch) {          
            migrationData.costs.projectedCloudCost +=
              cheapestExactMatch.onDemandPrice;
          } else if (cheapestNextMatch) {
            migrationData.costs.projectedCloudCost +=
              cheapestNextMatch.onDemandPrice;
          }

          if (isCloud) {
            migrationData.guidsCloudHostsSrc.push(
              systemSample['latest.entityGuid']
            );
            migrationData.storageBytesCloudSrc +=
              systemSample['latest.diskTotalBytes'];
          } else {
            migrationData.guidsOnPremHostsSrc.push(
              systemSample['latest.entityGuid']
            );
            migrationData.storageBytesOnPremSrc +=
              systemSample['latest.diskTotalBytes'];
          }
        }
      }
    }
  }

  Object.keys(migrationData.costs).forEach(key => {
    switch (costPeriod.value) {
      case 'D':
        migrationData.costs[key] = migrationData.costs[key] * 24;
        break;
      case 'M':
        migrationData.costs[key] = migrationData.costs[key] * 24 * 30;
        break;
      case 'Y':
        migrationData.costs[key] = migrationData.costs[key] * 24 * 30 * 12;
        break;
      case '2Y':
        migrationData.costs[key] = migrationData.costs[key] * 24 * 30 * 12 * 2;
        break;
      case '3Y':
        migrationData.costs[key] = migrationData.costs[key] * 24 * 30 * 12 * 3;
        break;
    }
    // migrationData.costs[key] = formatValue(migrationData.costs[key]);
  });

  // console.log(migrationData);

  return migrationData;
};

export const addWorkloadMigration = (
  workload,
  migrationData,
  srcWorkloadGuid,
  tgtWorkloadGuid
) => {
  if (workload.data) {
    if (srcWorkloadGuid) {
      // tgt
      migrationData.noEntitiesTgt += workload.entities.length;

      migrationData.costs.totalCloudCostPost +=
        ((workload || {}).data || {}).totalOnDemandCost || 0;

      migrationData.costs.totalDatacenterCostPost +=
        ((workload || {}).data || {}).totalDatacenterCUCost || 0;
    } else if (tgtWorkloadGuid) {
      // src
      migrationData.noEntitiesSrc += workload.entities.length;

      migrationData.costs.totalCloudCostPre +=
        ((workload || {}).data || {}).totalOnDemandCost || 0;

      migrationData.costs.totalDatacenterCostPre +=
        ((workload || {}).data || {}).totalDatacenterCUCost || 0;
    }
  }
};

export const formatValue = (cost, decimals) => {
  if (decimals) {
    return cost.toFixed(decimals).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }
  return cost.toString().replace(/\d(?=(\d{3})+\.)/g, '$&,');
};

export const getCheapestMatch = matches => {
  let cheapestCategory = '';
  let cheapestPrice = null;

  Object.keys(matches).forEach(category => {
    if (!cheapestPrice || matches[category].onDemandPrice < cheapestPrice) {
      cheapestCategory = category;
      cheapestPrice = matches[category].onDemandPrice;
    }
  });

  return matches[cheapestCategory];
};
