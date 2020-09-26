/* eslint 
no-console: 0,
no-async-promise-executor: 0
*/

import React from 'react';
import { Statistic, Header, Grid, Segment, Popup } from 'semantic-ui-react';
import { formatValue, getTagValue } from '../../../../shared/lib/utils';

export default class CostOverview extends React.PureComponent {
  render() {
    const { migrationData, workloads } = this.props;

    console.log(migrationData);

    // const costItems = [
    //   {
    //     key: 'preMigrationSpend',
    //     label: 'Pre Migration Spend',
    //     value: `$${formatValue(
    //       parseFloat(migrationData.costs.totalCurrentCost) +
    //         parseFloat(migrationData.costs.totalDatacenterCostPre)
    //     )}`
    //   },
    //   {
    //     key: 'dataCenterSped',
    //     label: 'Total Datacenter Spend',
    //     value: `$${formatValue(
    //       parseFloat(migrationData.costs.totalDatacenterCostPost) +
    //         parseFloat(migrationData.costs.totalDatacenterCostPre)
    //     )}`
    //   },
    //   {
    //     key: 'cloudSpend',
    //     label: 'Total Cloud Spend',
    //     value: `$${formatValue(
    //       parseFloat(migrationData.costs.totalCloudCostPost) +
    //         parseFloat(migrationData.costs.totalCloudCostPre)
    //     )}`
    //   }
    // ];

    const sourceItems = [
      {
        key: 'cloudCost',
        label: 'Cloud Spend',
        value: `$${formatValue(migrationData.costs.totalCloudCostPre, 2)}`
      },
      {
        key: 'dcCost',
        label: 'Datacenter Spend',
        value: `$${formatValue(migrationData.costs.totalDatacenterCostPre, 2)}`
      },
      {
        key: 'storage',
        label: 'Storage',
        value: `${formatValue(
          (migrationData.storageBytesOnPremSrc +
            migrationData.storageBytesCloudSrc) /
            1e9,
          2
        )} GB`
      }
    ];

    const targetItems = [
      {
        key: 'cloudCost',
        label: 'Cloud Spend',
        value: `$${formatValue(migrationData.costs.totalCloudCostPost, 2)}`
      },
      {
        key: 'dcCost',
        label: 'Datacenter Spend',
        value: `$${formatValue(migrationData.costs.totalDatacenterCostPost, 2)}`
      },
      {
        key: 'storage',
        label: 'Storage',
        value: `${formatValue(
          (migrationData.storageBytesOnPremTgt +
            migrationData.storageBytesCloudTgt) /
            1e9,
          2
        )} GB`
      }
    ];

    const noWorkloads = workloads.filter(wl =>
      getTagValue(wl.tags, 'tgtWorkloadGuid')
    ).length;

    return (
      <Grid.Row
        columns="equal"
        style={{ paddingTop: '0px', paddingBottom: '0px' }}
      >
        <Grid.Column>
          <Segment color="orange" raised>
            <div style={{ padding: '10px' }}>
            <Popup content='Current state summary of cloud source workload' trigger={<Header as="h5">SOURCE</Header>} />
              <div>
                <Statistic.Group
                  horizontal
                  size="mini"
                  items={sourceItems}
                  widths="3"
                />
              </div>
            </div>
          </Segment>
        </Grid.Column>
        <Grid.Column>
          <Segment color="blue" raised>
            <div style={{ padding: '10px' }}>
            <Popup content='Current state summary of cloud target workload' trigger={<Header as="h5">TARGET</Header>} />
              <div>
                <Statistic.Group
                  horizontal
                  size="mini"
                  items={targetItems}
                  widths="3"
                />
              </div>
            </div>
          </Segment>
        </Grid.Column>
        <Grid.Column width="6">
          <Segment color="green" raised>
            <div style={{ padding: '10px' }}>
            <Popup content='Current state summary of migration, assumes best possible cost for spend calculation.' trigger={<Header as="h5">SUMMARY</Header>} />
              <div>
                <Statistic.Group
                  horizontal
                  size="mini"
                  items={[
                    {
                      key: 'cloudCost',
                      label: 'Projected Cloud Spend',
                      value: `$${formatValue(
                        migrationData.costs.projectedCloudCost,
                        2
                      )}`
                    }
                  ]}
                  widths="3"
                />
                <Statistic size="mini" horizontal>
                  <Statistic.Value>{noWorkloads}</Statistic.Value>
                  <Statistic.Label>Workloads</Statistic.Label>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  <Statistic.Value style={{ float: 'right' }}>{`${
                    migrationData.noEntitiesTgt
                  } / ${migrationData.noEntitiesTgt +
                    migrationData.noEntitiesSrc}`}</Statistic.Value>
                  <Statistic.Label style={{ float: 'right' }}>
                    Entities Migrated
                  </Statistic.Label>
                </Statistic>
              
                <Statistic.Group
                  horizontal
                  size="mini"
                  items={[
                    {
                      key: 'storageMigrated',
                      label: 'Storage Migrated',
                      value: `${formatValue(
                        (migrationData.storageBytesOnPremTgt +
                          migrationData.storageBytesCloudTgt) /
                          1e9,
                        2
                      )} / ${formatValue(
                        (migrationData.storageBytesOnPremSrc +
                          migrationData.storageBytesCloudSrc +
                          migrationData.storageBytesOnPremTgt +
                          migrationData.storageBytesCloudTgt) /
                          1e9,
                        2
                      )} GB`
                    }
                  ]}
                />
              </div>
            </div>
          </Segment>
        </Grid.Column>

        {/* <Grid.Column>
          <Segment color="black" raised>
            <div style={{ padding: '10px' }}>
              <Header as="h5">SUMMARY</Header>
              <div>
                <Statistic.Group
                  horizontal
                  size="mini"
                  items={summaryItems}
                  widths="3"
                />
              </div>
            </div>
          </Segment>
        </Grid.Column> */}
      </Grid.Row>
    );
  }
}
