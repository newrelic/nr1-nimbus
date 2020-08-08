/* eslint 
no-console: 0
no-async-promise-executor: 0
*/
import React from 'react';
import {
  Grid,
  Header,
  Message,
  Dropdown,
  Table,
  Icon
} from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';
import { NerdGraphQuery, navigation } from 'nr1';
import { chunk } from '../../lib/helper';
import gql from 'graphql-tag';
import { nerdGraphQuery } from '../../../shared/lib/utils';

const relationshipQuery = accountId => `{
  actor {
    account(id: ${accountId}) {
      nrql(query: "from Relationship select uniques(sourceEntityGuid) where sourceEntityType='APPLICATION' LIMIT MAX") {
        results
      }
    }
  }
}`;

const entityQuery = guids => `{
  actor {
    entities(guids: [${guids}]) {
      relationships {
        target {
          entityType
          guid
          entity {
            tags {
              key
              values
            }
            name
            ... on ApmApplicationEntityOutline {
              language
            }
          }
        }
        source {
          entityType
          guid
          entity {
            tags {
              key
              values
            }
            name
            ... on ApmApplicationEntityOutline {
              language
            }
          }
        }
      }
      guid
      name
      entityType
      nrdbQuery(nrql: "SELECT uniqueCount(name) FROM Transaction") {
        results
      }
    }
  }
}`;

export default class ComplexityProfile extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { complexityResults: [], loading: false };
  }

  handleAccountChange = (e, d) => {
    this.setState({ loading: true }, () => {
      NerdGraphQuery.query({
        query: gql`
          ${relationshipQuery(d.value)}
        `
      }).then(value => {
        const results =
          (((
            ((((value || {}).data || {}).actor || {}).account || {}).nrql || {}
          ).results || {})[0] || {})['uniques.sourceEntityGuid'] || [];

        const entityChunks = chunk(results, 25);

        const entityPromises = entityChunks.map(chunk => {
          return new Promise(async resolve => {
            const guids = `"${chunk.join(`","`)}"`;
            const nerdGraphResult = await nerdGraphQuery(entityQuery(guids));
            if (!nerdGraphResult) {
              console.log(`query failure: ${entityQuery(guids)}`);
            }
            resolve(((nerdGraphResult || {}).actor || {}).entities || []);
          });
        });

        Promise.all(entityPromises).then(chunks => {
          const finalizedResults = [];
          chunks.forEach(chunk => {
            chunk.forEach(e => {
              const targetSummary = { total: 0 };
              const sourceSummary = { total: 0 };
              const languages = [];
              const guids = [e.guid];

              e.relationships.forEach(r => {
                guids.push(r.source.guid);
                guids.push(r.target.guid);

                if (r.source.entity && r.source.entity.language) {
                  languages.push(r.source.entity.language);
                }
                if (r.target.entity && r.target.entity.language) {
                  languages.push(r.target.entity.language);
                }

                if (!targetSummary[r.target.entityType]) {
                  targetSummary[r.target.entityType] = [];
                }
                targetSummary[r.target.entityType].push(r.target.entity);
                targetSummary.total++;

                if (!sourceSummary[r.source.entityType]) {
                  sourceSummary[r.source.entityType] = [];
                }
                sourceSummary[r.source.entityType].push(r.source.entity);
                sourceSummary.total++;
              });

              const summary = { ...e };
              summary.uniqueTransactionNames =
                e.nrdbQuery.results[0]['uniqueCount.name'];
              summary.targetSummary = targetSummary;
              summary.sourceSummary = sourceSummary;
              summary.relationshipsCount = e.relationships.length;
              summary.languages = [...new Set(languages)];
              summary.guids = [...new Set(guids)];

              summary.score =
                summary.languages.length +
                summary.uniqueTransactionNames +
                targetSummary.total;

              finalizedResults.push(summary);
            });
          });

          this.setState({
            loading: false,
            complexityResults: finalizedResults.sort(
              (a, b) => b.score - a.score
            )
          });
        });
      });
    });
  };

  render() {
    const { complexityResults, loading } = this.state;

    return (
      <DataConsumer>
        {({ accounts }) => {
          const accountOptions = accounts.map(acc => ({
            key: acc.id,
            text: acc.name,
            value: acc.id
          }));

          return (
            <Grid>
              <Grid.Row>
                <Grid.Column style={{ paddingTop: '15px' }}>
                  <Header as="h4" content="Complexity Profiler" />

                  <Message floating style={{ borderRadius: 0 }}>
                    <Message.Header>
                      Use the complexity profiler to determine the effort and
                      resources required to migrate your services.
                    </Message.Header>
                    <Message.List>
                      <Message.Item>Select Account</Message.Item>
                      <Dropdown
                        className="singledrop"
                        placeholder="Select Account"
                        search
                        selection
                        options={accountOptions}
                        onChange={this.handleAccountChange}
                      />
                    </Message.List>
                  </Message>
                </Grid.Column>
              </Grid.Row>

              <Grid.Row>
                <Grid.Column>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '10px',
                      display: loading ? '' : 'none'
                    }}
                  >
                    <Icon name="spinner" size="big" loading={loading} />
                  </div>
                  <Table
                    basic="very"
                    celled
                    style={{
                      display:
                        loading || complexityResults.length === 0 ? 'none' : ''
                    }}
                  >
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell>Application</Table.HeaderCell>
                        <Table.HeaderCell>Associated Entities</Table.HeaderCell>
                        <Table.HeaderCell>Score</Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>

                    <Table.Body>
                      {complexityResults.map((r, i) => {
                        console.log(r);
                        return (
                          <Table.Row key={i}>
                            <Table.Cell
                              style={{ cursor: 'pointer' }}
                              onClick={() =>
                                navigation.openStackedEntity(r.guid)
                              }
                            >
                              {r.name}
                            </Table.Cell>
                            <Table.Cell>{r.guids.length}</Table.Cell>
                            <Table.Cell>{r.score}</Table.Cell>
                          </Table.Row>
                        );
                      })}
                    </Table.Body>
                  </Table>
                </Grid.Column>
              </Grid.Row>
            </Grid>
          );
        }}
      </DataConsumer>
    );
  }
}
