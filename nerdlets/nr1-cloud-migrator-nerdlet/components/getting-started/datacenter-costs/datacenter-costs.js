/* eslint 
no-console: 0,
no-async-promise-executor: 0
*/

import React from 'react';
import {
  Grid,
  Dropdown,
  Header,
  Message,
  Button,
  Input,
  Segment
} from 'semantic-ui-react';
import gql from 'graphql-tag';
import { DataConsumer } from '../../../context/data';
import { NerdGraphMutation, NerdGraphQuery } from 'nr1';
import CostTables from './cost-tables';
import AddCost from './add-cost';
import { workloadsQuery } from '../../../../shared/lib/queries';
import { toast } from 'react-toastify';

toast.configure();

const costTables = [
  'Server',
  'Rack Infrastructure',
  'Software',
  'Storage',
  'Network',
  'Facilities',
  'Labor',
  'Miscellaneous'
];

export default class DatacenterCosts extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      cost: null,
      selectedAccount: null,
      datacenterName: '',
      creating: false
    };
  }

  createDatacenter = dataFetcher => {
    this.setState({ creating: true }, () => {
      const { selectedAccount, datacenterName } = this.state;
      this.handleMutation(selectedAccount.value, datacenterName);
      setTimeout(async () => {
        await dataFetcher(['workloads']);
        this.setState({
          creating: false,
          datacenterName: '',
          selectedAccount: null
        });
      }, 5000);
    });
  };

  handleMutation = async (accountId, datacenterName) => {
    const workloadsQueryResult = await NerdGraphQuery.query({
      query: workloadsQuery(accountId)
    });

    const workloadsResult =
      (
        ((((workloadsQueryResult || {}).data || {}).actor || {}).account || {})
          .workload || {}
      ).collections || null;

    if (workloadsResult) {
      let datacenterGuid = '';
      for (let z = 0; z < workloadsResult.length; z++) {
        if (
          workloadsResult[z].name
            .toLowerCase()
            .includes(`Datacenter: ${datacenterName}`.toLowerCase())
        ) {
          datacenterGuid = workloadsResult[z].guid;
          break;
        }
      }

      if (datacenterGuid === '') {
        const createDatacenterResult = await NerdGraphMutation.mutate({
          mutation: gql`mutation {
            workloadCreate(accountId: ${accountId}, workload: {name: "Datacenter: ${datacenterName}"}) {
              id
              name
              guid
            }
          }`
        });

        const result =
          ((createDatacenterResult || {}).data || {}).workloadCreate || null;

        if (result) {
          toast.success('Datacenter created.', {
            autoClose: 2500,
            containerId: 'B'
          });
        }
      } else {
        toast.warn('Datacenter already exists.', {
          autoClose: 2500,
          containerId: 'B'
        });
      }
    } else {
      toast.error('Unable to get existing Datacenters.', {
        autoClose: 2500,
        containerId: 'B'
      });
    }
  };

  render() {
    return (
      <DataConsumer>
        {({
          accounts,
          datacenters,
          selectedDatacenter,
          updateDataContextState,
          dataFetcher
        }) => {
          const { datacenterName, selectedAccount, creating } = this.state;
          const accountOptions = accounts.map(acc => ({
            key: acc.id,
            text: acc.name,
            value: acc.id
          }));

          const dcOptions = datacenters.map(dc => ({
            key: dc.name,
            text: dc.name.replace(/Datacenter:/g, ''),
            value: dc.name
          }));

          console.log(selectedDatacenter);

          const costOptions = costTables.map(c => ({
            key: c,
            text: c,
            value: c
          }));

          let dc = datacenters.filter(d => d.name === selectedDatacenter);
          dc = dc[0] || null;

          const dcDoc = (((dc || {}).dcDoc || {})[0] || {}).document || null;

          const costs = (dcDoc || {}).costs || null;
          const costTotal = dc ? dc.costTotal : null;

          return (
            <Grid>
              <Grid.Row style={{ paddingBottom: '0px' }}>
                <Grid.Column style={{ paddingTop: '15px' }}>
                  <Header as="h3">Datacenter Costs</Header>
                  <Message floating style={{ borderRadius: 0 }}>
                    <Message.Header>
                      Input your datacenter costs.
                    </Message.Header>
                    <Message.List>
                      <Message.Item>
                        The inputted costs will be used to estimate the running
                        cost of each instance for cost analysis.
                      </Message.Item>
                      <Message.Item>
                        If you don't see your datacenter please click the
                        "Refresh Datacenters" button.
                      </Message.Item>
                    </Message.List>
                  </Message>

                  <Message floating style={{ borderRadius: 0, zIndex: 105 }}>
                    <Message.Header>Create a datacenter.</Message.Header>
                    <Message.List>
                      <Message.Item>
                        Create an empty datacenter to assign costs.
                      </Message.Item>
                      <Message.Item>
                        If you are migrating from a VMware environment please
                        create your datacenter via{' '}
                        <a
                          onClick={() =>
                            updateDataContextState({
                              selectedPage: 'setup'
                            })
                          }
                        >
                          setup
                        </a>{' '}
                        to have it automatically created.
                      </Message.Item>
                      <Input
                        value={datacenterName}
                        placeholder="Datacenter Name"
                        onChange={e =>
                          this.setState({ datacenterName: e.target.value })
                        }
                      />
                      &nbsp;
                      <Dropdown
                        className="singledrop"
                        placeholder="Select Account"
                        search
                        selection
                        options={accountOptions}
                        onChange={(e, d) =>
                          this.setState({ selectedAccount: d })
                        }
                      />
                      &nbsp;
                      <Button
                        positive
                        content="Create Datacenter"
                        loading={creating}
                        disabled={!datacenterName || !selectedAccount}
                        onClick={() => this.createDatacenter(dataFetcher)}
                      />
                    </Message.List>
                  </Message>

                  <Message floating style={{ borderRadius: 0, zIndex: 100 }}>
                    <Message.Header>Select your datacenter.</Message.Header>
                    <Message.List>
                      <Dropdown
                        className="singledrop"
                        label="Select Datacenter"
                        placeholder="Select Datacenter"
                        search
                        selection
                        options={dcOptions}
                        value={selectedDatacenter}
                        onChange={(e, d) =>
                          updateDataContextState({
                            selectedDatacenter: d.value
                          })
                        }
                      />
                      &nbsp;
                      <Button
                        icon="external"
                        color="blue"
                        content="View Datacenter"
                        disabled={!selectedDatacenter}
                        onClick={() =>
                          window.open(
                            ` https://one.newrelic.com/redirect/entity/${dc.guid}`,
                            '_blank'
                          )
                        }
                      />
                      &nbsp;
                      <Button
                        icon="refresh"
                        color="blue"
                        content="Refresh Datacenters"
                        onClick={() => dataFetcher(['workloads'])}
                        style={{ float: 'right' }}
                      />
                    </Message.List>
                  </Message>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row style={{ display: selectedDatacenter ? '' : 'none' }}>
                <Grid.Column
                  style={{ display: dcOptions.length > 0 ? '' : 'none' }}
                >
                  <Segment raised>
                    <div style={{ margin: '9px', padding: '10px' }}>
                      {selectedDatacenter && dcDoc ? (
                        <CostTables
                          dc={dc}
                          guid={dc.guid}
                          doc={dcDoc || {}}
                          costTotal={costTotal}
                          costs={costs}
                          selectedDatacenter={selectedDatacenter}
                        />
                      ) : (
                        <>
                          <Header
                            as="h4"
                            content="Add your first cost."
                            style={{ paddingTop: '5px' }}
                          />
                          <Dropdown
                            className="singledrop"
                            label="Select Cost Category"
                            placeholder="Select Cost Category"
                            search
                            selection
                            options={costOptions}
                            value={this.state.cost}
                            onChange={(e, d) =>
                              this.setState({
                                cost: d.value
                              })
                            }
                          />
                          &nbsp;
                          <div
                            style={{
                              display: this.state.cost ? 'inline' : 'none'
                            }}
                          >
                            <AddCost
                              selectedCost={this.state.cost}
                              selectedDatacenter={selectedDatacenter}
                              button
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </Segment>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          );
        }}
      </DataConsumer>
    );
  }
}
