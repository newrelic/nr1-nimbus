import React from 'react';
import { Message, Dropdown, Grid, Button } from 'semantic-ui-react';
import { DataConsumer } from '../../../context/data';
import {
  getTagValue,
  calculateMigrationData,
  getAccountCollection,
  writeAccountDocument
} from '../../../../shared/lib/utils';
import { adjustCostValue } from '../../../context/helper';
import { Bar } from 'react-chartjs-2';

// import { AccountStorageMutation } from 'nr1';

export default class LiveSpend extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      selectedAccount: null,
      isLoading: false,
      snapshots: [],
      snapshotting: false
    };
  }

  loadSnapshots = d => {
    // AccountStorageMutation.mutate({
    //   accountId: d,
    //   actionType: AccountStorageMutation.ACTION_TYPE.DELETE_COLLECTION,
    //   collection: 'snapshots'
    // });

    this.setState({ selectedAccount: d, isLoading: true }, async () => {
      const snapshots = await getAccountCollection(d, 'snapshots');
      this.setState({ snapshots, isLoading: false });
    });
  };

  createSnapshots = todayTempSnapshots => {
    this.setState({ snapshotting: true }, async () => {
      const snapshotPromises = todayTempSnapshots.map(d =>
        writeAccountDocument(d.accountId, 'snapshots', d.documentId, d.document)
      );
      await Promise.all(snapshotPromises);
      this.setState({ snapshotting: false }, () => {
        setTimeout(() => {
          this.loadSnapshots(this.state.selectedAccount);
        }, 5000);
      });
    });
  };

  tagFilterSnapshots = (snapshots, tags, pluckWorkload) => {
    // if all tags false, return all workloads
    let noTags = 0;
    let falseTags = 0;
    Object.keys(tags).forEach(group => {
      Object.keys(tags[group]).forEach(item => {
        noTags++;
        if (tags[group][item] === false) falseTags++;
      });
    });

    if (noTags === falseTags) return snapshots;

    // check for enabled tags and return workload if it exists
    return snapshots.filter(s => {
      const wl = pluckWorkload(s.document.srcWorkloadGuid);

      for (let z = 0; z < Object.keys(tags).length; z++) {
        const group = Object.keys(tags)[z];
        for (let y = 0; y < Object.keys(tags[group]).length; y++) {
          const item = Object.keys(tags[group])[y];
          const value = tags[group][item];
          if (value) {
            if (getTagValue(wl.tags, group) === item) {
              return true;
            }
          }
        }
      }

      return false;
    });
  };

  sumMigrationData = (snapshots, timestamps, costPeriod) => {
    const values = [];

    timestamps.forEach(t => {
      const d1 = new Date(t);
      const day1 = d1.getDate();
      const month1 = d1.getMonth();
      const year1 = d1.getFullYear();

      const summedMigrationData = {
        noEntitiesSrc: 0,
        noEntitiesTgt: 0,
        storageBytesCloudSrc: 0,
        storageBytesOnPremSrc: 0,
        storageBytesCloudTgt: 0,
        storageBytesOnPremTgt: 0,
        entityProgressNumeric: { tgt: {}, src: {} },
        costs: {
          totalProjectedCost: 0, // projected cost from pre migration to post migration
          totalCurrentCost: 0, // current cost pre migration
          totalProjectedSaving: 0, // delta between current pre cost, and projected cost
          totalCloudCostPost: 0, // total current cloud spend hourly post
          totalCloudCostPre: 0, // total current cloud spend hourly pre
          totalDatacenterCostPost: 0,
          totalDatacenterCostPre: 0,
          projectedCloudCost: 0
        }
      };

      snapshots.forEach(s => {
        const d2 = new Date(s.document.timestamp);
        const day2 = d2.getDate();
        const month2 = d2.getMonth();
        const year2 = d2.getFullYear();
        const { costs } = s.document.migrationData;

        if (year1 === year2 && month1 === month2 && day1 === day2) {
          summedMigrationData.costs.totalProjectedCost +=
            costs.totalProjectedCost;
          summedMigrationData.costs.totalCurrentCost += costs.totalCurrentCost;
          summedMigrationData.costs.totalProjectedSaving +=
            costs.totalProjectedSaving;
          summedMigrationData.costs.totalCloudCostPost +=
            costs.totalCloudCostPost;
          summedMigrationData.costs.totalCloudCostPre +=
            costs.totalCloudCostPre;
          summedMigrationData.costs.totalDatacenterCostPost +=
            costs.totalDatacenterCostPost;
          summedMigrationData.costs.totalDatacenterCostPre +=
            costs.totalDatacenterCostPre;
          summedMigrationData.costs.projectedCloudCost +=
            costs.projectedCloudCost;
        }
      });

      Object.keys(summedMigrationData.costs).forEach(key => {
        summedMigrationData.costs[key] = adjustCostValue(
          costPeriod.value,
          summedMigrationData.costs[key]
        );
      });

      values.push(summedMigrationData);
    });

    return values;
  };

  createGraphData = (snapshots, costPeriod, todayTempSnapshots) => {
    // console.log(snapshots, todayTempSnapshots);
    let highestDate = null;
    let lowestDate = null;
    snapshots.forEach(s => {
      if (s.document.timestamp > highestDate || highestDate === null) {
        highestDate = s.document.timestamp;
      }
      if (s.document.timestamp < lowestDate || lowestDate === null) {
        lowestDate = s.document.timestamp;
      }
    });

    const days = Math.floor((highestDate - lowestDate) / 86400000);
    const labels = [];
    const timestamps = [];

    if (days === 0) {
      // return single day
      const day = new Date(highestDate);
      labels.push(
        `${day.getDate()}/${day.getMonth() + 1}/${day.getFullYear()}`
      );
      timestamps.push(highestDate);
    } else {
      for (let d = lowestDate; d <= highestDate; d += 86400000) {
        const day = new Date(d);
        labels.push(
          `${day.getDate()}/${day.getMonth() + 1}/${day.getFullYear()}`
        );
        timestamps.push(d);
      }
    }

    const td = new Date();
    labels.push(
      `Right Now - ${td.getDate()}/${td.getMonth() + 1}/${td.getFullYear()}`
    );

    const sourceValuesCloudCost = [];
    const targetValuesCloudCost = [];
    const sourceValuesDatacenterCost = [];
    const targetValuesDatacenterCost = [];
    const projectedCloudSpendValues = [];

    // current snapshot costs
    this.sumMigrationData(snapshots, timestamps, costPeriod).forEach(v => {
      sourceValuesCloudCost.push(v.costs.totalCloudCostPre);
      targetValuesCloudCost.push(v.costs.totalCloudCostPost);
      sourceValuesDatacenterCost.push(v.costs.totalDatacenterCostPre);
      targetValuesDatacenterCost.push(v.costs.totalDatacenterCostPost);
      projectedCloudSpendValues.push(v.costs.projectedCloudCost);
    });

    // active costs
    this.sumMigrationData(
      todayTempSnapshots,
      [new Date().getTime()],
      costPeriod
    ).forEach(v => {
      sourceValuesCloudCost.push(v.costs.totalCloudCostPre);
      targetValuesCloudCost.push(v.costs.totalCloudCostPost);
      sourceValuesDatacenterCost.push(v.costs.totalDatacenterCostPre);
      targetValuesDatacenterCost.push(v.costs.totalDatacenterCostPost);
      projectedCloudSpendValues.push(v.costs.projectedCloudCost);
    });

    const options = {
      maintainAspectRatio: false,
      responsive: true,
      tooltips: {
        mode: 'label'
      },
      elements: {
        line: {
          fill: false
        }
      },
      scales: {
        xAxes: [
          {
            display: true,
            gridLines: {
              display: false
            },
            labels: labels
          }
        ],
        yAxes: [
          {
            type: 'linear',
            display: true,
            position: 'right',
            id: 'y-axis-1',
            gridLines: {
              display: false
            },
            labels: {
              show: true
            }
          },
          {
            type: 'linear',
            display: true,
            position: 'left',
            id: 'y-axis-2',
            gridLines: {
              display: false
            },
            labels: {
              show: true
            }
          }
        ]
      }
    };

    const data = {
      datasets: [
        {
          label: 'Source Cloud Spend',
          type: 'line',
          data: sourceValuesCloudCost,
          fill: false,
          borderColor: '#EC932F',
          backgroundColor: '#EC932F',
          pointBorderColor: '#EC932F',
          pointBackgroundColor: '#EC932F',
          pointHoverBackgroundColor: '#EC932F',
          pointHoverBorderColor: '#EC932F',
          yAxisID: 'y-axis-2'
        },
        {
          label: 'Target Cloud Spend',
          type: 'line',
          data: targetValuesCloudCost,
          fill: false,
          backgroundColor: 'rgba(75,192,192,0.4)',
          borderColor: 'rgba(75,192,192,1)',
          borderCapStyle: 'butt',
          pointBorderColor: 'rgba(75,192,192,1)',
          pointBackgroundColor: '#fff',
          pointHoverBackgroundColor: 'rgba(75,192,192,1)',
          pointHoverBorderColor: 'rgba(220,220,220,1)',
          yAxisID: 'y-axis-2'
        },
        {
          label: 'Source Datacenter Spend',
          type: 'line',
          data: sourceValuesDatacenterCost,
          fill: false,
          backgroundColor: 'rgb(255, 205, 86)',
          borderColor: 'rgb(255, 205, 86)',
          borderCapStyle: 'butt',
          pointBorderColor: 'rgb(255, 205, 86)',
          pointBackgroundColor: '#fff',
          pointHoverBackgroundColor: 'rgb(255, 205, 86)',
          pointHoverBorderColor: 'rgb(255, 205, 86)',
          yAxisID: 'y-axis-2'
        },
        {
          label: 'Target Datacenter Spend',
          type: 'line',
          data: targetValuesDatacenterCost,
          fill: false,
          backgroundColor: 'rgb(153, 102, 255)',
          borderColor: 'rgb(153, 102, 255)',
          borderCapStyle: 'butt',
          pointBorderColor: 'rgb(153, 102, 255)',
          pointBackgroundColor: '#fff',
          pointHoverBackgroundColor: 'rgb(153, 102, 255)',
          pointHoverBorderColor: 'rgb(153, 102, 255)',
          yAxisID: 'y-axis-2'
        },
        {
          label: 'Project Cloud Spend',
          type: 'line',
          data: projectedCloudSpendValues,
          fill: false,
          backgroundColor: '#00cc00',
          borderColor: '#00cc00',
          borderCapStyle: 'butt',
          pointBorderColor: '#00cc00',
          pointBackgroundColor: '#fff',
          pointHoverBackgroundColor: '#00cc00',
          pointHoverBorderColor: '#00cc00',
          yAxisID: 'y-axis-2'
        }
      ]
    };

    return { options, data };
  };

  render() {
    const { snapshots, selectedAccount, snapshotting, isLoading } = this.state;

    return (
      <DataConsumer>
        {({ workloads, accounts, pluckWorkload, tagSelection, costPeriod }) => {
          const accountOptions = accounts.map(acc => ({
            key: acc.id,
            text: acc.name,
            value: acc.id
          }));

          // create individual snapshots for each workload
          const srcWorkloads = workloads.filter(wl =>
            getTagValue(wl.tags, 'tgtWorkloadGuid')
          ); // filter source workloads

          const todayTempSnapshots = srcWorkloads.map(wl => {
            const migrationId = getTagValue(wl.tags, 'm.MigrationId');
            const tgtWorkloadGuid = getTagValue(wl.tags, 'tgtWorkloadGuid');
            const tgtWorkload = pluckWorkload(tgtWorkloadGuid);

            const d = new Date();
            const year = d.getFullYear().toString();
            const month = (d.getMonth() + 1).toString();
            const date = d.getDate().toString();

            const migrationData = calculateMigrationData(
              [wl, tgtWorkload],
              { key: 1, label: 'HOURLY', value: 'H' } // save in the smallest unit
            );

            // delete the guids returned, as this makes the payload too large
            delete migrationData.entityProgress;
            delete migrationData.guidsCloudHostsSrc;
            delete migrationData.guidsCloudHostsTgt;
            delete migrationData.guidsOnPremHostsSrc;
            delete migrationData.guidsOnPremHostsTgt;

            // creating a document id per below spec, allows us to force 1 snapshot per day, rather then use a full timestamp
            return {
              accountId: selectedAccount,
              documentId: `${migrationId}-${year}:${month}:${date}`,
              document: {
                srcWorkloadGuid: wl.guid,
                timestamp: d.getTime(),
                migrationData
              }
            };
          });

          const tagFilteredSnapshots = this.tagFilterSnapshots(
            snapshots,
            tagSelection,
            pluckWorkload
          );
          const { options, data } = this.createGraphData(
            tagFilteredSnapshots,
            costPeriod,
            todayTempSnapshots
          );

          return (
            <>
              <Grid.Row style={{ paddingTop: '0' }}>
                <Grid.Column>
                  <Message floating style={{ borderRadius: 0 }}>
                    <Message.Header>
                      Select your New Relic account to view and store your
                      snapshots for tracking.
                    </Message.Header>
                    <Message.List>
                      <Message.Item>
                        Daily snapshots are manually created by you and stored
                        against your New Relic account.
                      </Message.Item>
                      <Message.Item>
                        You can snapshot more then once per day, with the last
                        snapshot being kept.
                      </Message.Item>
                    </Message.List>
                    <Message.List>
                      <Dropdown
                        className="singledrop"
                        placeholder="Select Account"
                        search
                        selection
                        options={accountOptions}
                        onChange={(e, d) => this.loadSnapshots(d.value)}
                      />
                      <div
                        style={{
                          float: 'right',
                          display: selectedAccount ? '' : 'none'
                        }}
                      >
                        &nbsp;
                        <Button
                          icon="camera"
                          color="grey"
                          content="Create Snapshot"
                          loading={snapshotting || isLoading}
                          onClick={() =>
                            this.createSnapshots(todayTempSnapshots)
                          }
                        />
                        &nbsp;
                        <Button
                          icon="refresh"
                          color="grey"
                          content="Refresh Snapshots"
                          loading={isLoading}
                          onClick={() => this.loadSnapshots(selectedAccount)}
                        />
                      </div>
                    </Message.List>
                  </Message>
                </Grid.Column>
              </Grid.Row>
              <Grid.Row>
                <Grid.Column>
                  {snapshots.length === 0 && selectedAccount
                    ? 'No snapshots found, please create a snapshot to begin tracking.'
                    : ''}
                  {snapshots.length === 0 || isLoading || snapshotting ? (
                    ''
                  ) : (
                    <div style={{ height: '500px', paddingBottom: '50px' }}>
                      {/* <Header as="h5">Cash Flow Milestones - {noMonths} months</Header> */}
                      <Bar
                        data={data}
                        options={options}
                        height={50}
                        style={{ paddingBottom: '10px' }}
                      />
                      {/* plugins={plugins}  */}
                    </div>
                  )}
                </Grid.Column>
              </Grid.Row>
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
