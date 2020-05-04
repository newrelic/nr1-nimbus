import React from 'react';
import { DataConsumer } from '../../../context/data';
import {
  Grid,
  Table,
  Input,
  Header,
  Icon,
  Card,
  Divider,
  Button,
  Message
} from 'semantic-ui-react';
import {
  getTagValue,
  tagFilterWorkloads,
  calculateMigrationData
} from '../../../../shared/lib/utils';
import { deleteAllTagsQuery } from '../../../../shared/lib/queries';
import EditWorkloadProject from './edit-project-modal';
import { simpleEntityType } from '../../../lib/helper';
import CostOverview from './cost-overview';
import MigrationTagger from '../../tagging/migration-tagger';
import { NerdGraphMutation } from 'nr1';
import { toast } from 'react-toastify';

toast.configure();

export default class MigrationOverview extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      searchText: ''
    };
  }

  deleteWorkload = async (workload, dataFetcher) => {
    const actions = [];
    actions.push(
      NerdGraphMutation.mutate({
        mutation: `mutation {
          workloadDelete(guid: "${getTagValue(
            workload.tags,
            'tgtWorkloadGuid'
          )}") {
            name
          }
        }`
      })
    );

    actions.push(
      NerdGraphMutation.mutate({
        mutation: deleteAllTagsQuery(workload.guid)
      })
    );
    const results = await Promise.all(actions);
    if (results) {
      toast.warn('Deleted migration workload.', {
        autoClose: 5000,
        containerId: 'B'
      });
      await dataFetcher(['workloads']);
    }
  };

  render() {
    return (
      <DataConsumer>
        {({
          workloads,
          dataFetcher,
          tagSelection,
          updateDataContextState,
          pluckWorkload,
          costPeriod
        }) => {
          const { searchText } = this.state;

          const searchedWorkloads = workloads
            .filter(wl => !wl.name.startsWith('Datacenter:'))
            .filter(workload =>
              workload.name.toLowerCase().includes(searchText.toLowerCase())
            );

          const filteredWorkloads = tagFilterWorkloads(
            searchedWorkloads,
            tagSelection
          );

          const migrationData = calculateMigrationData(
            filteredWorkloads,
            costPeriod
          );

          return (
            <Grid>
              <Grid.Row>
                <Grid.Column style={{ paddingTop: '15px' }}>
                  <Header as="h3">Migration Overview</Header>
                  <Message floating style={{ borderRadius: 0 }}>
                    <Message.Header>
                      Summarized overview of all workloads available.
                    </Message.Header>
                    <Message.List>
                      <Message.Item>
                        Use the tag filter to dynamically filter the metrics and
                        workloads seen below.
                      </Message.Item>
                      <Message.Item>
                        Using search will also dynamically filter similarly to
                        the tag filter.
                      </Message.Item>
                      <Message.Item>
                        The cost period will dynamically adjust the figures seen
                        below.
                      </Message.Item>
                    </Message.List>
                  </Message>
                  <Divider />
                </Grid.Column>
              </Grid.Row>

              <CostOverview
                migrationData={migrationData}
                workloads={filteredWorkloads}
              />

              <Grid.Row>
                <Grid.Column>
                  <Divider />
                  <Input
                    placeholder="Search Workload..."
                    value={searchText}
                    onChange={e =>
                      this.setState({ searchText: e.target.value })
                    }
                    style={{ width: '33%', borderRadius: 0 }}
                  />
                  <div
                    style={{
                      float: 'right',
                      display: filteredWorkloads.length > 0 ? '' : 'none'
                    }}
                  >
                    <MigrationTagger
                      title="Edit all workload tags"
                      workloads={filteredWorkloads}
                    />
                  </div>
                  <br /> <br />
                  <Card.Group>
                    {filteredWorkloads.map((workload, i) => {
                      // do not render a card for target workloads
                      // if it contains a srcWorkloadGuid it is a targetWorkload for an existing migrations
                      if (getTagValue(workload.tags, 'srcWorkloadGuid')) {
                        return '';
                      }

                      const selectedMigration = {
                        value: workload.name,
                        label: workload.name,
                        guid: workload.guid
                      };

                      const tgtWorkload = pluckWorkload(
                        getTagValue(workload.tags, 'tgtWorkloadGuid')
                      );

                      if (!tgtWorkload) {
                        return '';
                      }

                      const statusBlock = {};

                      Object.keys(tgtWorkload.entityCount || {}).forEach(
                        key => {
                          if (!statusBlock[key]) {
                            statusBlock[key] = { pre: 0, post: 0 };
                          }
                          statusBlock[key].post =
                            tgtWorkload.entityCount[key].length;
                        }
                      );

                      Object.keys(workload.entityCount || {}).forEach(key => {
                        if (!statusBlock[key]) {
                          statusBlock[key] = { pre: 0, post: 0 };
                        }
                        statusBlock[key].pre = workload.entityCount[key].length;
                      });

                      return (
                        <Card key={`${workload.name}.${i}`}>
                          <Card.Content>
                            <Card.Header textAlign="center">
                              <span
                                onClick={() =>
                                  updateDataContextState({
                                    selectedMigration
                                  })
                                }
                                style={{
                                  cursor: 'pointer',
                                  textAlign: 'center'
                                }}
                              >
                                {workload.name}
                              </span>{' '}
                              &nbsp;
                              <EditWorkloadProject
                                selected={selectedMigration}
                              />
                            </Card.Header>

                            <Table compact basic="very">
                              <Table.Header>
                                <Table.Row style={{ fontSize: '14px' }}>
                                  <Table.HeaderCell>ENTITIES</Table.HeaderCell>
                                  <Table.HeaderCell
                                    style={{ textAlign: 'right' }}
                                  >
                                    <a
                                      onClick={() =>
                                        window.open(
                                          workload.permalink,
                                          '_blank'
                                        )
                                      }
                                    >
                                      SRC
                                    </a>
                                  </Table.HeaderCell>
                                  <Table.HeaderCell
                                    style={{ textAlign: 'right' }}
                                  >
                                    <a
                                      onClick={() =>
                                        window.open(
                                          tgtWorkload.permalink,
                                          '_blank'
                                        )
                                      }
                                    >
                                      TGT
                                    </a>
                                  </Table.HeaderCell>
                                </Table.Row>
                              </Table.Header>
                              <Table.Body>
                                {Object.keys(statusBlock).map((key, i) => (
                                  <Table.Row key={i}>
                                    <Table.Cell>
                                      {simpleEntityType(key)}
                                    </Table.Cell>
                                    <Table.Cell style={{ textAlign: 'right' }}>
                                      {statusBlock[key].pre}
                                    </Table.Cell>
                                    <Table.Cell style={{ textAlign: 'right' }}>
                                      {statusBlock[key].post}
                                    </Table.Cell>
                                  </Table.Row>
                                ))}
                              </Table.Body>
                            </Table>
                          </Card.Content>
                          <Card.Content extra>
                            <div>
                              {tgtWorkload.name.includes('MigrationId') ? (
                                ''
                              ) : (
                                <div>
                                  Migration ID:
                                  {getTagValue(workload.tags, 'm.MigrationId')}
                                  <br />
                                </div>
                              )}
                              Target: {tgtWorkload.name}
                            </div>
                          </Card.Content>
                          <Card.Content extra>
                            <a>
                              <Icon name="cube" />
                              {`${tgtWorkload.entities.length}/`}
                              {workload.entities.length +
                                tgtWorkload.entities.length}{' '}
                              Entities Migrated
                            </a>
                          </Card.Content>
                          <div style={{ paddingBottom: '10px' }}>
                            <div style={{ float: 'left', paddingLeft: '5px' }}>
                              <MigrationTagger
                                title="Edit tags"
                                workloads={[workload]}
                              />
                            </div>
                            <div
                              style={{ float: 'right', paddingRight: '5px' }}
                            >
                              <Button
                                circular
                                icon="close"
                                color="red"
                                content="Delete"
                                size="mini"
                                onClick={() =>
                                  this.deleteWorkload(workload, dataFetcher)
                                }
                              />
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </Card.Group>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          );
        }}
      </DataConsumer>
    );
  }
}
