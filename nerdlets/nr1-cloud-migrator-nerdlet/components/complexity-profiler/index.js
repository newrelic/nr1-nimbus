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
  Icon,
  Button
} from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';
import { NerdGraphQuery, NerdGraphMutation, navigation } from 'nr1';
import { chunk } from '../../lib/helper';
import gql from 'graphql-tag';
import { nerdGraphQuery, deleteWorkload } from '../../../shared/lib/utils';
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
    this.state = {
      complexityResults: [],
      loading: false,
      selectedAccount: null
    };
  }

  createWorkload = async (val, dataFetcher) => {
    toast.info(loadingMsg('Adding new workload...'), {
      autoClose: false,
      containerId: 'B',
      toastId: 'addWorkload'
    });

    console.log(val);

    const { selectedAccount } = this.state;

    let guidStr = '';
    const guids = val.guids.map(entity => entity.split(', ')[0]);
    guids.forEach(guid => {
      if (guid !== 'Other' && guid !== 'null') {
        guidStr += `"${guid}",`;
      }
    });
    guidStr = guidStr.slice(0, -1);

    const mutationQuery = `mutation {
      workloadCreate(accountId: ${selectedAccount}, workload: {entityGuids: [${guidStr}], name: "${val.name} - ComplexityProfile: ${val.score}"}) {
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

  handleAccountChange = (e, d) => {
    this.setState({ loading: true, selectedAccount: d.value }, () => {
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
              summary.uniqueTransactionNames = e.nrdbQuery.results
                ? e.nrdbQuery.results[0]['uniqueCount.name']
                : 0;
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
        {({ accounts, dataFetcher, workloads }) => {
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
                      Select Account <br />
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
                        <Table.HeaderCell style={{ textAlign: 'right' }}>
                          Score
                        </Table.HeaderCell>
                        <Table.HeaderCell width="3"></Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>

                    <Table.Body>
                      {complexityResults.map((r, i) => {
                        let foundWorkload = null;
                        for (let z = 0; z < workloads.length; z++) {
                          if (
                            workloads[z].name.startsWith(
                              `${r.name} - ComplexityProfile:`
                            )
                          ) {
                            foundWorkload = workloads[z];
                            break;
                          }
                        }

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
                            <Table.Cell style={{ textAlign: 'right' }}>
                              {r.score}
                            </Table.Cell>
                            <Table.Cell>
                              {foundWorkload ? (
                                <Button
                                  content="Delete workload"
                                  icon="minus"
                                  negative
                                  size="mini"
                                  floated="right"
                                  onClick={() =>
                                    this.delete(foundWorkload, dataFetcher)
                                  }
                                />
                              ) : (
                                <Button
                                  content="Create workload"
                                  icon="plus"
                                  color="blue"
                                  size="mini"
                                  floated="right"
                                  onClick={() =>
                                    this.createWorkload(r, dataFetcher)
                                  }
                                />
                              )}
                            </Table.Cell>
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
