/* eslint 
no-console: 0,
no-async-promise-executor: 0,
no-func-assign: 0,
require-atomic-updates: 0,
no-unused-vars: 0
*/

import React, { Component } from 'react';
import { NerdGraphQuery } from 'nr1';
import {
  getUserCollection,
  getEntityCollection,
  nerdGraphQuery,
  getTagValue
} from '../../shared/lib/utils';
import {
  fetchEntitiesInWorkload,
  workloadQueries,
  infraSampleBatchQuery,
  getTagsQuery
} from '../../shared/lib/queries';
import {
  decorateDatacenterData,
  getKeySets,
  getInstanceCost,
  getCloudRegions,
  buildTags
} from './helper';
import { chunk } from '../lib/helper';
import { Icon } from 'semantic-ui-react';
import { ToastContainer, toast } from 'react-toastify';

toast.configure();

const DataContext = React.createContext();
const userConfig = 'CmUserConfig';
const clouds = ['amazon', 'azure', 'google'];

export const loadingMsg = msg => (
  <>
    <Icon name="spinner" loading />
    {msg}
  </>
);

export const successMsg = msg => (
  <>
    <Icon name="check" />
    {msg}
  </>
);

export class DataProvider extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedPage: 'setup',
      selectedMigration: null,
      showWlConfig: false,
      availableWorkloads: [],
      migrationProjects: [],
      workloads: [],
      workloadQueries: [],
      tags: [],
      tagSelection: {},
      datacenters: [],
      accounts: [],
      keysets: {},
      cloudPrices: {},
      cloudRegions: {},
      entityData: {},
      hasDatacenter: false,
      costPeriod: { key: 3, label: 'YEARLY', value: 'Y' },
      bucketMs: { key: 1, label: '30 sec', value: 30000 }
    };
  }

  async componentDidMount() {
    const cloudRegions = await getCloudRegions(clouds);
    this.setState({ cloudRegions }, () => this.init());
  }

  init = () => {
    return new Promise((resolve, reject) => {
      this.dataFetcher(['userConfig', 'accounts']).then(async value => {
        if (value) {
          await this.dataFetcher(['workloads']);
          resolve('finished init fetch');
        } else {
          reject(new Error('failed init fetch'));
        }
      });
    });
  };

  updateDataContextState = (stateData, actions) => {
    console.log('Action:', actions);
    return new Promise(resolve => {
      this.setState(stateData, () => {
        resolve();
      });
    });
  };

  // pluck workload by guid or name
  pluckWorkload = (guid, name) => {
    const { workloads } = this.state;
    for (let z = 0; z < workloads.length; z++) {
      if (
        (guid && workloads[z].guid === guid) ||
        (name && workloads[z].name === name)
      ) {
        return workloads[z];
      }
    }
    return null;
  };

  // pluck datacenter by guid or name
  pluckDatacenter = (guid, name) => {
    const { datacenters } = this.state;
    for (let z = 0; z < datacenters.length; z++) {
      if (
        (guid && datacenters[z].guid === guid) ||
        (name && datacenters[z].name === name)
      ) {
        return datacenters[z];
      }
    }
    return null;
  };

  // fetch data as required, supply array things to fetch
  dataFetcher = async actions => {
    return new Promise(async resolve => {
      const dataPromises = [];
      const content = [];

      actions.forEach(async action => {
        switch (action) {
          case 'userConfig':
            content.push(action);
            dataPromises.push(getUserCollection(userConfig, 'v1'));
            break;
          case 'accounts':
            content.push(action);
            const accountsQuery = `{actor {accounts {name id}}}`;
            dataPromises.push(NerdGraphQuery.query({ query: accountsQuery }));
            break;
          case 'workloads':
            toast.info(loadingMsg('Fetching workloads...'), {
              autoClose: false,
              containerId: 'B',
              toastId: 'fetchWorkloads'
            });

            content.push(action);
            dataPromises.push(this.fetchEntities());
            break;
          case 'workloadOptimizationConfigs':
            toast.info(loadingMsg('Fetching optimization configs...'), {
              autoClose: false,
              containerId: 'B',
              toastId: 'updateOptimizationConfigs'
            });

            const { workloads } = this.state;
            if (workloads.length === 0)
              toast.dismiss('updateOptimizationConfigs');
            workloads.forEach(wl => {
              content.push(action);
              dataPromises.push(
                getEntityCollection('optimizationConfig', wl.guid, 'main')
              );
            });
            break;
          case 'workloadTags': {
            toast.info(loadingMsg('Updating tags...'), {
              autoClose: false,
              containerId: 'B',
              toastId: 'updateTags'
            });

            const { workloads } = this.state;
            if (workloads.length === 0) toast.dismiss('updateTags');
            workloads.forEach(wl => {
              content.push(action);
              dataPromises.push(
                NerdGraphQuery.query({ query: getTagsQuery(wl.guid) })
              );
            });
            break;
          }
          case 'datacenters':
            {
              const { datacenters } = this.state;
              console.log(datacenters);

              if (datacenters.length > 0) {
                toast.info(loadingMsg('Fetching datacenters...'), {
                  autoClose: false,
                  containerId: 'B',
                  toastId: 'fetchDatacenters'
                });

                datacenters.forEach(dc => {
                  content.push(action);
                  dataPromises.push(decorateDatacenterData(dc));
                });
              }
            }

            break;
        }
      });

      await Promise.all(dataPromises).then(async (values, z) => {
        const data = {};
        const { datacenters, workloads, tagSelection } = this.state;
        const tags = [];
        let dcDocCounter = 0;
        let wlCounter = 0;

        values.forEach((value, i) => {
          switch (content[i]) {
            case 'workloadOptimizationConfigs':
              toast.update('updateOptimizationConfigs', {
                autoClose: 3000,
                type: toast.TYPE.SUCCESS,
                containerId: 'B',
                render: successMsg('Optimization configs updated.')
              });

              workloads[wlCounter].optimizationConfig = value || null;
              wlCounter++;
              if (wlCounter >= workloads.length) wlCounter = 0;
              break;
            case 'workloadTags':
              toast.update('updateTags', {
                autoClose: 3000,
                type: toast.TYPE.SUCCESS,
                containerId: 'B',
                render: successMsg('Tags updated.')
              });

              workloads[wlCounter].tags =
                ((((value || {}).data || {}).actor || {}).entity || {}).tags ||
                [];
              data.workloads = data.workloads || workloads;
              data.tags = buildTags(tags, workloads[wlCounter].tags);

              workloads[wlCounter].tags.forEach(tag => {
                if (!tag.key.includes('Guid')) {
                  if (tagSelection[tag.key] === undefined) {
                    tagSelection[tag.key] = {};
                  }

                  if (
                    tag.values[0] &&
                    tagSelection[tag.key][tag.values[0]] === undefined
                  ) {
                    tagSelection[tag.key][tag.values[0]] = false;
                  }
                }
              });

              data.tagSelection = tagSelection;

              wlCounter++;
              if (wlCounter >= workloads.length) wlCounter = 0;
              break;
            case 'workloads':
              toast.update('fetchWorkloads', {
                autoClose: 3000,
                type: toast.TYPE.SUCCESS,
                containerId: 'B',
                render: successMsg('Fetched workloads.')
              });

              this.dataFetcher(['workloadTags']);
              break;
            case 'userConfig':
              data.userConfig = value || null;
              break;
            case 'accounts':
              data.accounts =
                (((value || {}).data || {}).actor || {}).accounts || [];
              break;
            case 'datacenters':
              toast.update('fetchDatacenters', {
                autoClose: 3000,
                type: toast.TYPE.SUCCESS,
                containerId: 'B',
                render: successMsg('Fetched datacenters.')
              });

              const { dcDoc, costTotal, totalCU } = value;
              datacenters[dcDocCounter].dcDoc = dcDoc;
              datacenters[dcDocCounter].costTotal = costTotal;
              datacenters[dcDocCounter].totalCU = totalCU;
              datacenters[dcDocCounter].costPerCU =
                totalCU === 0 || costTotal === 0
                  ? 0
                  : costTotal.value / 8760 / totalCU;

              dcDocCounter++;
              data.datacenters = datacenters;
              break;
          }
        });

        this.setState(data, () => {
          resolve('done');
        });
      });
    });
  };

  getOptimizationConfigs = workloads => {
    return new Promise(async resolve => {
      const optimizationConfigPromises = workloads.map(wl =>
        getEntityCollection('optimizationConfig', wl.guid, 'main')
      );
      await Promise.all(optimizationConfigPromises).then(values => {
        values.forEach((val, i) => {
          workloads[i].optimizationConfig = val || null;
        });
      });
      resolve(workloads);
    });
  };

  fetchEntities = () => {
    return new Promise(async resolve => {
      const { accounts } = this.state;
      const queryPromises = accounts.map(account =>
        NerdGraphQuery.query({ query: workloadQueries(account.id) })
      );

      let allWorkloads = [];

      await Promise.all(queryPromises).then(values => {
        values.forEach(value => {
          const collection =
            (
              ((((value || {}).data || {}).actor || {}).account || {})
                .workload || {}
            ).collections || [];

          allWorkloads = [...allWorkloads, ...collection];
        });
      });

      allWorkloads = await this.getOptimizationConfigs(allWorkloads);

      const datacenters = allWorkloads.filter(wl =>
        wl.name.startsWith('Datacenter:')
      );

      const workloads = allWorkloads.filter(
        wl => !wl.name.startsWith('Datacenter:')
      );

      this.setState({ datacenters, workloads }, async () => {
        const datacenterPromises = datacenters.map((wl, i) =>
          this.recursiveFetch('datacenters', wl, i, null)
        );
        await Promise.all(datacenterPromises);
        await this.dataFetcher(['datacenters']);
        console.log('finished datacenters');

        const wlPromises = workloads.map((wl, i) =>
          this.recursiveFetch('workloads', wl, i, null)
        );
        await Promise.all(wlPromises);
        console.log('finished workloads');

        resolve('finished workloads');
      });
    });
  };

  recursiveFetch = (wlType, workload, workloadNo, cursor) => {
    return new Promise(async resolve => {
      let result = null;
      if (cursor === null) {
        const result = await NerdGraphQuery.query({
          query: getTagsQuery(workload.guid)
        });
        workload.tags =
          ((((result || {}).data || {}).actor || {}).entity || {}).tags || [];
      }

      if (cursor) {
        result = await NerdGraphQuery.query({
          query: fetchEntitiesInWorkload(workload.entitySearchQuery, cursor)
        });
      } else {
        result = await NerdGraphQuery.query({
          query: fetchEntitiesInWorkload(workload.entitySearchQuery)
        });
      }

      result =
        ((((result || {}).data || {}).actor || {}).entitySearch || {})
          .results || [];

      if (result.entities) {
        // to properly list the VM entities, swap the entity type to an actual one
        result.entities = result.entities.map(e => {
          if (e.entityType === 'GENERIC_INFRASTRUCTURE_ENTITY') {
            e.trueEntityType = e.entityType;
            e.entityType = e.type || e.entityType;
          }
          return e;
        });

        workload.entities.push(...result.entities);
      }

      if (result.nextCursor) {
        await this.recursiveFetch(
          wlType,
          workload,
          workloadNo,
          result.nextCursor
        );
        resolve();
      } else {
        let newData = [];
        newData[workloadNo] = { ...workload };

        if (wlType === 'datacenters') {
          newData = this.state.datacenters;
        } else if (wlType === 'workloads') {
          newData = this.state.workloads;
        }

        if (workload.entities) {
          newData[workloadNo].entities = workload.entities;
        } else {
          workload.entities = [];
        }

        const { entityCount, entities } = this.handleEntities(
          workload.entities
        );
        newData[workloadNo].entities = entities || [];
        newData[workloadNo].entityCount = entityCount;

        newData[workloadNo].data = await this.getWorkloadData(
          newData[workloadNo]
        );

        // this is an indicator to render the side menu item
        if (newData[workloadNo].name.startsWith('Datacenter:')) {
          this.setState({ hasDatacenter: true });
        }

        this.setState({ [wlType]: newData }, async () => {
          console.log('completed fetch for workload', workloadNo, wlType);
          resolve();
        });
      }
    });
  };

  // filter out unneeded entities, and calculate entity count
  handleEntities = entities => {
    const entityCount = {};
    entities = (entities || []).filter(entity => {
      if (entity.entityType && entity.entityType !== 'UNAVAILABLE_ENTITY') {
        if (!entityCount[entity.entityType]) {
          entityCount[entity.entityType] = [];
        }
        entityCount[entity.entityType].push(entity);
      }
      return entity.entityType && entity.entityType !== 'UNAVAILABLE_ENTITY';
    });
    return { entityCount, entities };
  };

  refreshData = () => {
    let interval = this.state.bucketMs.value;
    Do = Do.bind(this);
    this.refresh = setInterval(async () => Do(), interval);

    async function Do() {
      if (interval !== this.state.bucketMs.value) {
        console.log(
          `Updating... (timer: ${interval}ms to ${this.state.bucketMs.value}ms)`
        );
        interval = this.state.bucketMs.value;
        clearInterval(this.refresh);
        this.refresh = setInterval(async () => Do(), interval);
      }
      if (!this.state.isRefreshing) {
        if (this.state.selectedMap) {
          this.toastRef = toast(`Refreshing...`, {
            containerId: 'C',
            autoClose: 10000
          });

          console.log(
            `Refreshing... (timer: ${interval}ms) ${new Date().getTime()}`
          );
          this.setState({ isRefreshing: true }, async () => {
            // update this with relevant command
            // await this.handleMapData();
            console.log('fake refresh, update with relevant command later');

            toast.dismiss(this.toastRef);
            this.setState({ isRefreshing: false });
          });
        }
      } else {
        console.log(
          `Already refreshing... waiting for next cycle (timer: ${interval}ms) ${new Date().getTime()}`
        );
      }
    }
  };

  getWorkloadData = wl => {
    return new Promise(async resolve => {
      const workload = { ...wl };
      const { entityData, cloudPrices } = this.state;
      let allEntities = [];

      const infraHostEntities = workload.entities.filter(
        entity => entity.entityType === 'INFRASTRUCTURE_HOST_ENTITY'
      );

      // get unique account ids
      const accountIds = [
        ...new Set(infraHostEntities.map(entity => entity.account.id))
      ];

      // need to use keysets in the infra query
      // but depending on account
      const keysetByAccount = await getKeySets(accountIds);
      // console.log(keysetByAccount);

      // since we don't know the entityType of the workload.entities returned, we will check all
      let infraGuids = [
        ...infraHostEntities.map(entity => entity.guid),
        ...workload.entities.map(wl => wl.guid)
      ];

      // do not re-collect data
      infraGuids.forEach((guid, i) => {
        if (entityData[guid]) {
          allEntities.push(entityData[guid]);
          console.log('deleting from main array');
          delete infraGuids[i];
        }
      });
      infraGuids = infraGuids.filter(guid => guid);

      const entityChunks = chunk(infraGuids, 25);

      const entityPromises = entityChunks.map(chunk => {
        return new Promise(async resolve => {
          const guids = `"${chunk.join(`","`)}"`;
          const nerdGraphResult = await nerdGraphQuery(
            infraSampleBatchQuery(guids)
          );
          if (!nerdGraphResult) {
            console.log(`query failure: ${infraSampleBatchQuery(guids)}`);
          }
          resolve(((nerdGraphResult || {}).actor || {}).entities || []);
        });
      });

      // flatten entities
      const newEntityData = await Promise.all(entityPromises).then(
        async values => {
          let entities = [];
          values.forEach(value => {
            entities = [...entities, ...value];
          });
          return entities;
        }
      );

      allEntities = [...allEntities, ...newEntityData].filter(
        (v, i, a) => a.findIndex(t => t.guid === v.guid) === i
      ); // remove duplicates

      // get price lists for entities
      await this.getPriceLists(
        allEntities,
        getTagValue(workload.tags, 'cloud'),
        getTagValue(workload.tags, 'region')
      );

      let datacenterCUCost = null;
      if (!wl.name.startsWith('Datacenter:')) {
        const datacenterGuid = getTagValue(workload.tags, 'datacenterGuid');
        if (datacenterGuid) {
          const datacenterWorkload = this.pluckDatacenter(datacenterGuid);
          if (datacenterWorkload && datacenterWorkload.costPerCU) {
            datacenterCUCost = datacenterWorkload.costPerCU;
          }
          // console.log('got dc guid', datacenterGuid, allEntities.length);
        }
      }

      const targetCloud = getTagValue(workload.tags, 'cloud');
      const targetCloudRegion = getTagValue(workload.tags, 'region');

      // add some logic to fetch cloud if it doesn't exist, should probably be in setup

      // fetch cost for each entity
      allEntities = await Promise.all(
        allEntities.map(entity =>
          getInstanceCost(
            entity,
            cloudPrices,
            datacenterCUCost,
            targetCloud,
            targetCloudRegion,
            wl.optimizationConfig
          )
        )
      );

      let totalOnDemandCost = 0;
      let totalDatacenterCUCost = 0;
      allEntities.forEach(entity => {
        entityData[entity.guid] = entity;
        if (entity.instanceResult) {
          totalOnDemandCost += entity.instanceResult.onDemandPrice;
        }
        if (entity.DatacenterCUCost) {
          totalDatacenterCUCost += entity.DatacenterCUCost;
        }
      });

      this.setState({ entityData }, () => {
        resolve({
          entityData: allEntities,
          totalOnDemandCost,
          totalDatacenterCUCost,
          datacenterCUCost
        });
      });
    });
  };

  getPriceLists = (entities, workloadCloud, workloadRegion) => {
    return new Promise(async resolve => {
      const { cloudPrices } = this.state;

      // build pricing lists from entities
      // track in objects to ensure uniqueness
      entities.forEach(entity => {
        const systemSample =
          (((entity || {}).systemSample || {}).results || {})[0] || null;
        if (systemSample) {
          if (systemSample['latest.instanceType']) {
            if (systemSample['latest.awsRegion']) {
              if (!cloudPrices.amazon) cloudPrices.amazon = {};
              if (!cloudPrices.amazon[systemSample['latest.awsRegion']])
                cloudPrices.amazon[systemSample['latest.awsRegion']] = {};
            } else if (systemSample['latest.zone']) {
              if (!cloudPrices.google) cloudPrices.google = {};
              if (!cloudPrices.google[systemSample['latest.zone']])
                cloudPrices.google[systemSample['latest.zone']] = {};
            } else if (systemSample['latest.regionName']) {
              if (!cloudPrices.azure) cloudPrices.azure = {};
              if (!cloudPrices.azure[systemSample['latest.regionName']])
                cloudPrices.azure[systemSample['latest.regionName']] = {};
            } else {
              // console.log(
              //   'instance does not have cloud data available for region/zone detection'
              // );
            }
          }
        }
      });

      const priceTrack = [];
      const pricingListPromises = [];

      if (workloadCloud && workloadRegion) {
        priceTrack.push({ cloud: workloadCloud, region: workloadRegion });
        pricingListPromises.push(
          fetch(
            `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/${workloadCloud}/compute/pricing/${workloadRegion}.json`
          )
        );
      }

      Object.keys(cloudPrices).forEach(cloud => {
        Object.keys(cloudPrices[cloud]).forEach(region => {
          priceTrack.push({ cloud, region });
          pricingListPromises.push(
            fetch(
              `https://nr1-cloud-optimize.s3-ap-southeast-2.amazonaws.com/${cloud}/compute/pricing/${region}.json`
            )
          );
        });
      });

      const responsePromises = await Promise.all(
        pricingListPromises
      ).then(async values => values.map(value => value.json()));

      const responseValues = await Promise.all(responsePromises).then(
        responseValues => responseValues
      );

      responseValues.forEach((value, i) => {
        if (!cloudPrices[priceTrack[i].cloud])
          cloudPrices[priceTrack[i].cloud] = {};
        cloudPrices[priceTrack[i].cloud][priceTrack[i].region] = value;
      });

      // sort cheapest price first
      Object.keys(cloudPrices).forEach(cloud => {
        Object.keys(cloudPrices[cloud]).forEach(region => {
          cloudPrices[cloud][region].products =
            cloudPrices[cloud][region].products ||
            [].sort(
              (a, b) =>
                parseFloat(a.onDemandPrice || 0) -
                parseFloat(b.onDemandPrice || 0)
            );
        });
      });

      this.setState({ cloudPrices }, () => {
        resolve();
      });
    });
  };

  render() {
    const { children } = this.props;

    return (
      <DataContext.Provider
        value={{
          ...this.state,
          updateDataContextState: this.updateDataContextState,
          dataFetcher: this.dataFetcher,
          pluckWorkload: this.pluckWorkload,
          pluckDatacenter: this.pluckDatacenter,
          init: this.init
        }}
      >
        <ToastContainer
          enableMultiContainer
          containerId="B"
          position={toast.POSITION.TOP_RIGHT}
        />

        <ToastContainer
          enableMultiContainer
          containerId="C"
          position={toast.POSITION.BOTTOM_RIGHT}
        />

        {children}
      </DataContext.Provider>
    );
  }
}

export const DataConsumer = DataContext.Consumer;
