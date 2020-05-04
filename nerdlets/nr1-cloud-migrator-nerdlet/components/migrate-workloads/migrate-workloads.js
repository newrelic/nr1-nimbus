import React from 'react';
import { DataConsumer } from '../../context/data';
import {
  Grid,
  Table,
  Input,
  Header,
  Message,
  Button,
  Divider,
  Segment
} from 'semantic-ui-react';
import CreateWorkloadProject from './create-project-modal';
import { getTagValue, deleteWorkload } from '../../../shared/lib/utils';
import { nrTableHeaderCell } from '../../css/style';

export default class MigrateWorkloads extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      searchText: ''
    };
  }

  selectWorkload = (updateDataContextState, workload) => {
    const selected = {
      value: workload.name,
      label: workload.name,
      guid: workload.guid
    };
    updateDataContextState({ selectedMigration: selected });
  };

  render() {
    return (
      <DataConsumer>
        {({
          workloads,
          pluckWorkload,
          updateDataContextState,
          dataFetcher
        }) => {
          const { searchText } = this.state;
          const searchedWorkloads = workloads
            .filter(
              wl =>
                !wl.name.startsWith('Datacenter:') &&
                !getTagValue(wl.tags, 'srcWorkloadGuid') // if it contains a srcWorkloadGuid it is a targetWorkload for an existing migration
            )
            .filter(workload =>
              workload.name.toLowerCase().includes(searchText.toLowerCase())
            );

          return (
            <Grid>
              <Grid.Row>
                <Grid.Column style={{ paddingTop: '15px' }}>
                  <Header as="h3">Select a workload to migrate</Header>
                  <Message floating style={{ borderRadius: 0 }}>
                    <Message.Header>
                      View your current workloads available for migration.
                    </Message.Header>
                    <Message.List>
                      <Message.Item>
                        Deleting a source workload will delete the source
                        workload completely.
                      </Message.Item>
                      <Message.Item>
                        Deleting a target workload will decouple the source and
                        target while also deleting the target completely, the
                        source will not be deleted.
                      </Message.Item>
                      <Message.Item>
                        Tag your cloud resources with the "MigrationId" tag to
                        have your workload automatically tracked.
                      </Message.Item>
                    </Message.List>
                  </Message>
                  <Divider />
                  <Input
                    placeholder="Search Workload..."
                    value={searchText}
                    onChange={e =>
                      this.setState({ searchText: e.target.value })
                    }
                    style={{ width: '33%' }}
                  />
                  &nbsp;
                  <Button
                    style={{ float: 'right' }}
                    content="Refresh Workloads"
                    icon="refresh"
                    color="blue"
                    onClick={() => dataFetcher(['workloads'])}
                  />
                  <Segment raised>
                    <div style={{ margin: '9px' }}>
                      <Table compact basic="very" columns="16">
                        <Table.Header>
                          <Table.Row
                            style={{ fontSize: '16px' }}
                            verticalAlign="middle"
                          >
                            <Table.HeaderCell
                              style={nrTableHeaderCell}
                            ></Table.HeaderCell>
                            <Table.HeaderCell style={nrTableHeaderCell}>
                              Source
                            </Table.HeaderCell>
                            <Table.HeaderCell
                              textAlign="right"
                              style={nrTableHeaderCell}
                            >
                              Entities
                            </Table.HeaderCell>
                            <Table.HeaderCell style={nrTableHeaderCell}>
                              Target
                            </Table.HeaderCell>
                            <Table.HeaderCell
                              textAlign="right"
                              style={nrTableHeaderCell}
                            >
                              Entities
                            </Table.HeaderCell>
                            <Table.HeaderCell
                              textAlign="right"
                              style={nrTableHeaderCell}
                            >
                              Migration Id
                            </Table.HeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {searchedWorkloads.map(workload => {
                            const tgtWorkloadGuid = getTagValue(
                              workload.tags,
                              'tgtWorkloadGuid'
                            );
                            const migrationId = getTagValue(
                              workload.tags,
                              'm.MigrationId'
                            );

                            const tgtWorkload = pluckWorkload(tgtWorkloadGuid);

                            return (
                              <Table.Row
                                key={workload.id}
                                style={{ fontSize: '14px' }}
                              >
                                <Table.Cell width={1} textAlign="center">
                                  {!tgtWorkloadGuid ? (
                                    <CreateWorkloadProject
                                      selectedWorkload={workload}
                                    />
                                  ) : (
                                    <Button
                                      circular
                                      size="mini"
                                      icon="circle"
                                      color="blue"
                                      style={{ float: 'right' }}
                                      content="&nbsp;&nbsp;&nbsp;Active&nbsp;&nbsp;&nbsp;"
                                      onClick={() =>
                                        this.selectWorkload(
                                          updateDataContextState,
                                          workload
                                        )
                                      }
                                    />
                                  )}
                                </Table.Cell>
                                <Table.Cell width={7}>
                                  &nbsp;&nbsp;&nbsp;
                                  <span style={{ verticalAlign: 'bottom' }}>
                                    {workload.name}
                                  </span>
                                  <Button
                                    circular
                                    size="mini"
                                    icon="delete"
                                    negative
                                    content="Delete"
                                    style={{ float: 'right' }}
                                    onClick={async () => {
                                      await deleteWorkload(workload);
                                      await dataFetcher(['workloads']);
                                      await dataFetcher(['workloadTags']);
                                    }}
                                  />
                                </Table.Cell>
                                <Table.Cell textAlign="right" width={1}>
                                  {workload.entities
                                    ? workload.entities.length
                                    : 0}
                                </Table.Cell>
                                <Table.Cell width={7}>
                                  {tgtWorkload ? (
                                    <>
                                      {tgtWorkload.name}
                                      <Button
                                        circular
                                        size="mini"
                                        icon="delete"
                                        negative
                                        content="Delete"
                                        style={{ float: 'right' }}
                                        onClick={async () => {
                                          await deleteWorkload(tgtWorkload);
                                          await dataFetcher(['workloads']);
                                          await dataFetcher(['workloadTags']);
                                        }}
                                      />
                                    </>
                                  ) : (
                                    ''
                                  )}
                                </Table.Cell>
                                <Table.Cell textAlign="right" width={1}>
                                  {tgtWorkload && tgtWorkload.entities
                                    ? tgtWorkload.entities.length
                                    : ''}
                                </Table.Cell>
                                <Table.Cell>{migrationId}</Table.Cell>
                              </Table.Row>
                            );
                          })}
                        </Table.Body>
                      </Table>
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
