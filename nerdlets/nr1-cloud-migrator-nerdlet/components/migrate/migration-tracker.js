import React from 'react';
import { DataConsumer } from '../../context/data';
import {
  Grid,
  Header,
  Divider,
  Progress,
  Button,
  Table
} from 'semantic-ui-react';
import { getTagValue, calculateMigrationData } from '../../../shared/lib/utils';
import { nrTableHeaderCell } from '../../css/style';
import { navigation } from 'nr1';
import CostOverview from '../overview/migration/cost-overview';

export default class MigrationTracker extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      selectedSource: [],
      selectedTarget: []
    };
  }

  renderEntities = entities => {
    if (entities.length === 0) return '';

    return (
      <div
        style={{ maxHeight: '500px', overflow: 'auto', overflowX: 'hidden' }}
      >
        <Table compact size="small">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell style={nrTableHeaderCell}>
                Entity Name
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {entities.map(entity => {
              return (
                <Table.Row key={entity.guid}>
                  <Table.Cell>
                    <a
                      onClick={() => navigation.openStackedEntity(entity.guid)}
                    >
                      {entity.name}
                    </a>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </div>
    );
  };

  render() {
    return (
      <DataConsumer>
        {({ selectedMigration, pluckWorkload, costPeriod }) => {
          const { selectedSource, selectedTarget } = this.state;
          const srcWorkload = pluckWorkload(selectedMigration.guid);
          const tgtWorkload = pluckWorkload(
            getTagValue(srcWorkload.tags, 'tgtWorkloadGuid')
          );

          const migrationData = calculateMigrationData(
            [srcWorkload, tgtWorkload],
            costPeriod
          );

          return (
            <Grid>
              <Grid.Row>
                <Grid.Column style={{ paddingTop: '15px' }}>
                  <Header as="h3" content="Migration Tracker" />
                </Grid.Column>
              </Grid.Row>
              <CostOverview
                migrationData={migrationData}
                workloads={[srcWorkload, tgtWorkload]}
              />
              <Divider />
              <Grid.Row columns="3">
                <Grid.Column>
                  <Header as="h3" content="Progress by Entity Type" />
                  {Object.keys(migrationData.entityProgress.src).map(
                    (entityType, i) => {
                      let progress = 0;
                      const total =
                        migrationData.entityProgress.src[entityType].length +
                        migrationData.entityProgress.tgt[entityType].length;

                      if (
                        migrationData.entityProgress.src[entityType].length ===
                        0
                      ) {
                        progress = 100;
                      } else if (
                        migrationData.entityProgress.tgt[entityType].length ===
                        0
                      ) {
                        progress = 0;
                      } else {
                        progress =
                          (migrationData.entityProgress.src[entityType].length /
                            total) *
                          100;
                      }
                      return (
                        <div key={i} style={{ marginBottom: '45px' }}>
                          <Progress
                            percent={progress}
                            progress
                            indicating
                            style={{ marginBottom: '5px' }}
                          />
                          <span
                            style={{ float: 'left' }}
                          >{`${entityType
                            .replace('ENTITY', 'ENTITIES')
                            .replace(/_/g, ' ')} ${
                            migrationData.entityProgress.tgt[entityType].length
                          }/${total}`}</span>
                          <Button
                            style={{ float: 'right' }}
                            color="blue"
                            circular
                            size="mini"
                            icon="eye"
                            content="View"
                            onClick={() => {
                              this.setState({
                                selectedSource:
                                  migrationData.entityProgress.src[entityType],
                                selectedTarget:
                                  migrationData.entityProgress.tgt[entityType]
                              });
                            }}
                          />
                        </div>
                      );
                    }
                  )}
                </Grid.Column>
                <Grid.Column>
                  <Header as="h3" content="Remaining Entities" />
                  {selectedSource.length === 0
                    ? "Click 'View' to see the selected entities"
                    : ''}
                  {this.renderEntities(selectedSource)}
                </Grid.Column>
                <Grid.Column>
                  <Header as="h3" content="Migrated Entities" />
                  {this.renderEntities(selectedTarget)}
                </Grid.Column>
              </Grid.Row>
            </Grid>
          );
        }}
      </DataConsumer>
    );
  }
}
