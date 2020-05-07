import React from 'react';
import {
  Dropdown,
  Card,
  Icon,
  Button,
  Message,
  Input
} from 'semantic-ui-react';
import { DataConsumer } from '../../../context/data';
import { NrqlQuery, NerdGraphMutation, navigation } from 'nr1';
import { deleteWorkload } from '../../../../shared/lib/utils';
import { toast } from 'react-toastify';

toast.configure();

const loadingMsg = msg => (
  <>
    <Icon name="spinner" loading />
    {msg}
  </>
);

const successMsg = msg => (
  <>
    <Icon name="check" />
    {msg}
  </>
);

const errorMsg = msg => (
  <>
    <Icon name="delete" />
    {msg}
  </>
);

export default class DetectedWorkloads extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      selectedAccount: null,
      suggestedWorkloads: [],
      searchText: '',
      loading: false
    };
  }

  handleAccountChange = account => {
    this.setState({ loading: true }, async () => {
      await this.fetchDatacenterNetworks(account);
      this.setState({ selectedAccount: account, loading: false });
    });
  };

  fetchDatacenterNetworks = async accountId => {
    const vmwareNetworksResult = await NrqlQuery.query({
      accountId: accountId,
      query: `FROM VSphereHostSample, VSphereVmSample  SELECT uniques(networkNameList) FACET datacenterLocation`
    });

    const vmwareNetworksByDatacenter =
      ((vmwareNetworksResult || {}).data || {}).chart || [];

    const datacenterInfo = {};

    vmwareNetworksByDatacenter.forEach(dc => {
      datacenterInfo[dc.metadata.name] = [
        ...new Set(
          (dc.data || [])
            .map(n => n.networkNameList.split('|'))
            .flat()
            .filter(n => n)
        )
      ];
    });

    const requestTrack = [];
    const requestPromises = [];

    Object.keys(datacenterInfo).forEach(dc => {
      datacenterInfo[dc].forEach(nw => {
        requestTrack.push({ dc, nw, entities: [] });
        requestPromises.push(
          NrqlQuery.query({
            accountId: accountId,
            query: `SELECT 1 from VSphereVmSample FACET entityGuid, vmConfigName, hypervisorHostname WHERE datacenterLocation = '${dc}' AND networkNameList LIKE '%${nw}%' LIMIT MAX`
            // query: `SELECT 1 from VSphereVmSample, VSphereHostSample FACET entityGuid, vmConfigName, hypervisorHostname WHERE datacenterLocation = '${dc}' AND networkNameList LIKE '%${nw}%' LIMIT MAX`
          })
        );
      });
    });

    await Promise.all(requestPromises).then(values => {
      values.forEach((val, i) => {
        if (val.data && val.data.chart) {
          val.data.chart.forEach(res => {
            const split = res.metadata.name.split(', ');
            if (split.length === 3 && split[1] !== 'null') {
              // avoids adding hypervisors
              requestTrack[i].entities.push(res.metadata.name);
            }
          });
        }
      });
    });

    this.setState({ suggestedWorkloads: requestTrack });

    // const result = await NrqlQuery.query({
    //   accountId: accountId,
    //   query: `SELECT uniques(network.0), uniques(network.1), uniques(network.2), uniques(network.3), uniques(network.4) from SystemSample FACET datacenterLocation`
    // });

    // const datacenterInfo = {};

    // // collect networks per datacenter location
    // if (result.data && result.data.chart) {
    //   result.data.chart.forEach(res => {
    //     const split = res.metadata.name.split(', ');
    //     if (!datacenterInfo[split[0]]) datacenterInfo[split[0]] = [];

    //     res.data.forEach(r => {
    //       datacenterInfo[split[0]].push(r[split[1].toLowerCase()]);
    //     });
    //     datacenterInfo[split[0]] = [...new Set(datacenterInfo[split[0]])];
    //   });
    // }

    // const requestTrack = [];
    // const requestPromises = [];

    // note, do not add hypervisors?

    // Object.keys(datacenterInfo).forEach(dc => {
    //   datacenterInfo[dc].forEach(nw => {
    //     requestTrack.push({ dc, nw, entities: [] });
    //     requestPromises.push(
    //       NrqlQuery.query({
    //         accountId: accountId,
    //         query: `SELECT 1 from SystemSample FACET entityGuid, configName WHERE configName IS NOT NULL AND datacenterLocation = '${dc}' AND network.0 = '${nw}' OR network.1 = '${nw}' OR network.2 = '${nw}' OR network.3 = '${nw}' OR network.4 = '${nw}' LIMIT MAX`
    //       })
    //     );
    //   });
    // });

    // await Promise.all(requestPromises).then(values => {
    //   values.forEach((val, i) => {
    //     if (val.data && val.data.chart) {
    //       val.data.chart.forEach(res => {
    //         requestTrack[i].entities.push(res.metadata.name);
    //       });
    //     }
    //   });
    // });

    // this.setState({ suggestedWorkloads: requestTrack });
  };

  createWorkload = async (val, dataFetcher) => {
    toast.info(loadingMsg('Adding new workload...'), {
      autoClose: false,
      containerId: 'B',
      toastId: 'addWorkload'
    });

    const { selectedAccount } = this.state;

    let guidStr = '';
    const guids = val.entities.map(entity => entity.split(', ')[0]);
    guids.forEach(guid => {
      if (guid !== 'Other' && guid !== 'null') {
        guidStr += `"${guid}",`;
      }
    });
    guidStr = guidStr.slice(0, -1);

    const name = `${val.dc} - ${val.nw}`;

    const mutationQuery = `mutation {
      workloadCreate(accountId: ${selectedAccount}, workload: {entityGuids: [${guidStr}], name: "${name}"}) {
        name
        id
        guid
      }
    }`;

    const createWorkloadResult = await NerdGraphMutation.mutate({
      mutation: mutationQuery
    });

    if (
      createWorkloadResult &&
      createWorkloadResult.data &&
      createWorkloadResult.data.workloadCreate
    ) {
      toast.update('addWorkload', {
        autoClose: 3000,
        type: toast.TYPE.SUCCESS,
        containerId: 'B',
        render: successMsg('Workload added.')
      });
    } else {
      toast.update('addWorkload', {
        autoClose: 3000,
        type: toast.TYPE.ERROR,
        containerId: 'B',
        render: errorMsg('Failed to add workload.')
      });
    }
    await dataFetcher(['workloads']);
  };

  delete = async (wl, dataFetcher) => {
    await deleteWorkload(wl);
    await dataFetcher(['workloads']);
  };

  render() {
    return (
      <DataConsumer>
        {({ accounts, dataFetcher, workloads }) => {
          const accountOptions = accounts.map(acc => ({
            key: acc.id,
            text: acc.name,
            value: acc.id
          }));

          const {
            selectedAccount,
            suggestedWorkloads,
            searchText,
            loading
          } = this.state;

          const searchedWorkloads = suggestedWorkloads.filter(wl =>
            `${wl.dc} - ${wl.nw}`
              .toLowerCase()
              .includes(searchText.toLowerCase())
          );

          return (
            <>
              <Message floating style={{ borderRadius: 0 }}>
                <Message.Header>
                  Automatically detected workloads.
                </Message.Header>
                <Message.List>
                  <Message.Item>
                    Select an account below to view suggested workloads.
                  </Message.Item>
                  <Message.Item>
                    If networking information is available, suggested workloads
                    will be returned to help guide your migration.
                  </Message.Item>
                  <Dropdown
                    className="singledrop"
                    placeholder="Select Account"
                    search
                    selection
                    value={selectedAccount}
                    options={accountOptions}
                    onChange={(e, d) => this.handleAccountChange(d.value)}
                  />
                </Message.List>
              </Message>
              <div
                style={{
                  textAlign: 'center',
                  padding: '10px',
                  display: loading ? '' : 'none'
                }}
              >
                <Icon name="spinner" size="big" loading={loading} />
              </div>
              <br />
              <Input
                placeholder="Search..."
                value={searchText}
                onChange={e => this.setState({ searchText: e.target.value })}
                style={{
                  width: '33%',
                  display: suggestedWorkloads.length > 0 ? '' : 'none'
                }}
              />
              &nbsp;
              <br /> <br />
              <Card.Group>
                {searchedWorkloads.map((val, i) => {
                  let foundWorkload = null;
                  for (let z = 0; z < workloads.length; z++) {
                    if (workloads[z].name === `${val.dc} - ${val.nw}`) {
                      foundWorkload = workloads[z];
                      break;
                    }
                  }

                  return (
                    <Card key={i}>
                      <Card.Content>
                        <Card.Header>{val.dc}</Card.Header>
                        <Card.Description>{val.nw}</Card.Description>
                        <br />

                        <div
                          style={{
                            maxHeight: '200px',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            paddingLeft: '10px'
                          }}
                        >
                          {val.entities.map((entity, i) => {
                            const split = entity.split(', ');
                            if (split.length !== 3 || split[0] === 'null')
                              return <React.Fragment key={i} />;
                            return (
                              <React.Fragment key={`${split[0]}.${i}`}>
                                <a
                                  onClick={() =>
                                    navigation.openStackedEntity(split[0])
                                  }
                                >
                                  {split[1] === 'null'
                                    ? `Host: ${split[2]}`
                                    : `${split[1]}`}
                                </a>
                                <br />
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </Card.Content>

                      <Card.Content extra>
                        <a>
                          <Icon name="cube" />
                          {val.entities.length} Entities
                        </a>
                      </Card.Content>

                      <div style={{ paddingBottom: '10px' }}>
                        <div style={{ float: 'right', paddingRight: '5px' }}>
                          {foundWorkload ? (
                            <Button
                              circular
                              icon="delete"
                              color="red"
                              content="Delete"
                              size="mini"
                              onClick={() =>
                                this.delete(foundWorkload, dataFetcher)
                              }
                            />
                          ) : (
                            <Button
                              circular
                              icon="plus"
                              color="green"
                              content="Create"
                              size="mini"
                              onClick={() =>
                                this.createWorkload(val, dataFetcher)
                              }
                            />
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </Card.Group>
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
