import React from 'react';
import { Grid, Header, Divider, Segment } from 'semantic-ui-react';
import { DataConsumer } from '../../../context/data';
import { getTagValue } from '../../../../shared/lib/utils';
import { LineChart, ChartGroup } from 'nr1';

const entitiesAndQueries = [
  {
    name: 'Browser',
    type: 'BROWSER_APPLICATION_ENTITY',
    entityMsg: accountId => (
      <span>
        &nbsp;
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={`https://rpm.newrelic.com/accounts/${accountId}/browser/new`}
        >
          Instrument with Browser.
        </a>
      </span>
    ),
    rows: 1,
    queries: [
      {
        title: 'Throughput',
        query: `SELECT rate(count(*), 1 minute) AS 'Initial page load' FROM PageView FACET appName TIMESERIES WHERE entityGuid IN `,
        chart: 'line'
      },
      {
        title: 'JS Errors',
        query: `SELECT count(*) FROM JavaScriptError FACET appName TIMESERIES WHERE entityGuid IN `,
        chart: 'line'
      }
    ]
  },
  {
    name: 'Synthetics',
    type: 'SYNTHETIC_MONITOR_ENTITY',
    entityMsg: accountId => (
      <span>
        &nbsp;
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={`https://synthetics.newrelic.com/accounts/${accountId}/synthetics`}
        >
          Instrument with Synthetics.
        </a>
      </span>
    ),
    rows: 1,
    queries: [
      {
        title: 'Success Rate',
        query: `SELECT percentage(count(*), WHERE result = 'SUCCESS') FROM SyntheticCheck FACET monitorName TIMESERIES WHERE typeLabel = 'Ping' AND monitorId IN `,
        chart: 'line'
      },
      {
        title: 'Average Response',
        query: `SELECT average(duration) FROM SyntheticCheck FACET monitorName TIMESERIES WHERE typeLabel = 'Ping' AND monitorId IN `,
        chart: 'line'
      }
    ]
  },
  {
    name: 'APM',
    type: 'APM_APPLICATION_ENTITY',
    entityMsg: accountId => (
      <span>
        &nbsp;
        <a
          target="_blank"
          rel="noopener noreferrer"
          href={`https://rpm.newrelic.com/accounts/${accountId}/applications/setup`}
        >
          Instrument with APM.
        </a>
      </span>
    ),
    rows: 1,
    queries: [
      {
        title: 'Average Response (ms)',
        query:
          'SELECT average(duration) FROM Transaction TIMESERIES FACET appName WHERE entityGuid IN ',
        chart: 'line'
      },
      {
        title: 'Error Rate',
        query:
          'SELECT count(*) FROM TransactionError TIMESERIES FACET appName WHERE entityGuid IN ',
        chart: 'line'
      }
    ]
  },
  {
    name: 'Infrastructure',
    type: 'INFRASTRUCTURE_HOST_ENTITY',
    entityMsg: (accountId, updateDataContextState) => (
      <span>
        &nbsp;
        <a onClick={() => updateDataContextState({ selectedPage: 'setup' })}>
          Install the Infrastructure Agent.
        </a>
      </span>
    ),
    rows: 1,
    queries: [
      {
        title: 'Average CPU %',
        query:
          'SELECT average(cpuPercent) FROM SystemSample TIMESERIES FACET entityName WHERE entityGuid IN ',
        chart: 'line'
      },
      {
        title: 'Average Memory %',
        query:
          'SELECT average(memoryUsedBytes/memoryTotalBytes*100) FROM SystemSample TIMESERIES FACET entityName WHERE entityGuid IN ',
        chart: 'line'
      }
    ]
  },
  {
    name: 'VMware VM',
    type: 'VSPHEREVM',
    entityMsg: (accountId, updateDataContextState) => (
      <span>
        &nbsp;
        <a onClick={() => updateDataContextState({ selectedPage: 'setup' })}>
          Install the nri-vsphere infrastructure integration.
        </a>
      </span>
    ),
    rows: 1,
    queries: [
      {
        title: 'Average CPU %',
        query:
          'SELECT average(cpu.hostUsagePercent) FROM VSphereVmSample TIMESERIES FACET entityName WHERE entityGuid IN ',
        chart: 'line'
      },
      {
        title: 'Average Memory %',
        query: `SELECT  max(mem.usage/mem.size) *100 as 'max.memoryPercent' FROM VSphereVmSample TIMESERIES FACET entityName WHERE entityGuid IN `,
        chart: 'line'
      }
    ]
  }
];

const createChart = (q, accountId, type, entities) => {
  let idStr = '';
  if (type === 'SYNTHETIC_MONITOR_ENTITY') {
    (entities || []).forEach(entity => {
      idStr += `'${entity.monitorId}',`;
    });
  } else {
    (entities || []).forEach(entity => {
      idStr += `'${entity.guid}',`;
    });
  }
  idStr = idStr.slice(0, -1);

  const chartQuery = `${q.query} (${idStr}) LIMIT MAX`;

  switch (q.chart) {
    case 'line':
      return (
        <LineChart
          style={{ width: '95%' }}
          accountId={accountId}
          query={chartQuery}
        />
      );
  }
};

export default class MigrationPeformance extends React.PureComponent {
  render() {
    return (
      <DataConsumer>
        {({ selectedMigration, pluckWorkload, updateDataContextState }) => {
          const srcWorkload = pluckWorkload(selectedMigration.guid);
          const tgtWorkload = pluckWorkload(
            getTagValue(srcWorkload.tags, 'tgtWorkloadGuid')
          );

          return (
            <Grid columns="equal">
              <Grid.Row>
                <Grid.Column style={{ paddingTop: '15px' }}>
                  <Header as="h3" content="Migration Performance" />
                </Grid.Column>
              </Grid.Row>

              {entitiesAndQueries.map((entity, i) => {
                return (
                  <Grid.Row key={i}>
                    <Grid.Column width={16}>
                      <Header
                        as="h4"
                        content={entity.name}
                        style={{ paddingBottom: '5px' }}
                      />
                    </Grid.Column>

                    <Divider />
                    <Grid.Column width={16}>
                      {entity.entityMsg(
                        srcWorkload.account.id,
                        updateDataContextState
                      )}
                      <br />
                      <br />
                    </Grid.Column>

                    <ChartGroup>
                      {entity.queries.map((q, z) => {
                        return (
                          <React.Fragment key={z}>
                            <Grid.Column
                              width={16 / (entity.queries.length / entity.rows)}
                            >
                              <Segment style={{ display: 'flex' }} raised>
                                <div
                                  style={{ flex: '0 0 50%', padding: '10px' }}
                                >
                                  <div style={{ paddingBottom: '10px' }}>
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        textTransform: 'uppercase',
                                        fontWeight: 'bold',
                                        paddingBottom: '5px'
                                      }}
                                    >
                                      Source:
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        textTransform: 'uppercase'
                                      }}
                                    >
                                      &nbsp;{q.title}
                                    </span>
                                  </div>
                                  {createChart(
                                    q,
                                    srcWorkload.account.id,
                                    entity.type,
                                    srcWorkload.entityCount[entity.type]
                                  )}
                                </div>
                                <div style={{ flex: '1', padding: '5px' }}>
                                  <div style={{ paddingBottom: '10px' }}>
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        textTransform: 'uppercase',
                                        fontWeight: 'bold',
                                        paddingBottom: '5px'
                                      }}
                                    >
                                      Target:
                                    </span>
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        textTransform: 'uppercase'
                                      }}
                                    >
                                      &nbsp;{q.title}
                                    </span>
                                  </div>
                                  {createChart(
                                    q,
                                    tgtWorkload.account.id,
                                    entity.type,
                                    tgtWorkload.entityCount[entity.type]
                                  )}
                                </div>
                              </Segment>
                            </Grid.Column>
                          </React.Fragment>
                        );
                      })}
                    </ChartGroup>
                  </Grid.Row>
                );
              })}
            </Grid>
          );
        }}
      </DataConsumer>
    );
  }
}
