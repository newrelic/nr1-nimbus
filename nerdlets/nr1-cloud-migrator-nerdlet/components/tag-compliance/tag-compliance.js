import React from 'react';
import { Grid, Header, Table, Message } from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';
import { nrTableHeaderCell } from '../../css/style';
import { navigation } from 'nr1';
import { getTagValue } from '../../../shared/lib/utils';

export default class TagCompliance extends React.PureComponent {
  render() {
    return (
      <DataConsumer>
        {({ selectedMigration, pluckWorkload }) => {
          const workload = pluckWorkload(selectedMigration.guid);
          const tgtWorkload = pluckWorkload(
            getTagValue(workload.tags, 'tgtWorkloadGuid')
          );

          const checkTags = (tags, keyset) => {
            const mandatoryTags = tags.filter(tag => tag.key.startsWith('m.'));

            keyset.forEach(set => {
              for (let z = 0; z < mandatoryTags.length; z++) {
                if (mandatoryTags[z].key === set.key) {
                  mandatoryTags[z].found = true;
                  break;
                }
              }
            });

            const foundTags = mandatoryTags
              .filter(t => t.found)
              .map(t => t.key.replace('m.', ''));
            const missingTags = mandatoryTags
              .filter(t => !t.found)
              .map(t => t.key.replace('m.', ''));

            return { foundTags, missingTags };
          };

          return (
            <Grid>
              <Grid.Row>
                <Grid.Column style={{ paddingTop: '15px' }}>
                  <Header as="h4" content="Tag Compliance" />

                  <Message floating style={{ borderRadius: 0 }}>
                    <Message.Header>
                      Ensure your resources have the mandatory tagging that has
                      been defined.
                    </Message.Header>
                    <Message.List>
                      <Message.Item>
                        The relevant cloud based integration is required to be
                        installed for this feature to work correctly.
                      </Message.Item>
                    </Message.List>
                  </Message>

                  {tgtWorkload.data.entityData.length > 0 ? (
                    <Table basic attached="top">
                      <Table.Header>
                        <Table.Row>
                          <Table.HeaderCell style={nrTableHeaderCell}>
                            Instance
                          </Table.HeaderCell>
                          <Table.HeaderCell style={nrTableHeaderCell}>
                            Missing Tags
                          </Table.HeaderCell>
                          <Table.HeaderCell style={nrTableHeaderCell}>
                            Current Tags
                          </Table.HeaderCell>
                        </Table.Row>
                      </Table.Header>

                      <Table.Body>
                        {tgtWorkload.data.entityData.map((entity, i) => {
                          const systemSample =
                            (((entity || {}).systemSample || {}).results ||
                              {})[0] || null;

                          const isCloud =
                            systemSample['latest.awsRegion'] ||
                            systemSample['latest.regionName'] ||
                            systemSample['latest.zone'] ||
                            null;

                          if (!isCloud) return null;

                          const keyset =
                            ((entity || {}).keyset || {}).results || {} || null;

                          const { foundTags, missingTags } = checkTags(
                            workload.tags,
                            keyset
                          );

                          return (
                            <Table.Row
                              key={i}
                              negative={missingTags.length > 0}
                              positive={missingTags.length === 0}
                            >
                              <Table.Cell>
                                <a
                                  key={systemSample['latest.entityGuid']}
                                  onClick={() =>
                                    navigation.openStackedEntity(
                                      systemSample['latest.entityGuid']
                                    )
                                  }
                                >
                                  {systemSample['latest.hostname']}
                                </a>
                              </Table.Cell>
                              <Table.Cell>
                                {missingTags.toString().replace(/,/g, ', ')}
                              </Table.Cell>
                              <Table.Cell>
                                {foundTags.toString().replace(/,/g, ', ')}
                              </Table.Cell>
                            </Table.Row>
                          );
                        })}
                      </Table.Body>
                    </Table>
                  ) : (
                    <Header
                      as="h4"
                      content="No entities reporting. Start migrating your workload."
                    />
                  )}
                </Grid.Column>
              </Grid.Row>
            </Grid>
          );
        }}
      </DataConsumer>
    );
  }
}
