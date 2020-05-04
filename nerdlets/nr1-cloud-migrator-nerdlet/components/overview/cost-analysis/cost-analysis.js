import React from 'react';
import { DataConsumer } from '../../../context/data';
import { CostProvider, CostConsumer } from '../../../context/cost';
import { Grid, Header, Divider, Message, Tab } from 'semantic-ui-react';
import {
  calculateMigrationData,
  tagFilterWorkloads
} from '../../../../shared/lib/utils';
import CashFlowMilestones from './cash-flow-milestones';
import AnnualOngoingCosts from './annual-ongoing-cost';
import CostSetup from './cost-setup';
import LiveSpend from './live-spend';

const calculateTargetData = (postCosts, completionMonth, noMonths) => {
  // create array for target
  const targetData = [];
  const incrementTargetCost = postCosts / completionMonth;
  for (let z = 0; z < completionMonth; z++) {
    if (z === 0) {
      targetData.push(incrementTargetCost);
    } else {
      targetData.push(incrementTargetCost + targetData[z - 1]);
    }
  }

  // make a 1% increment to the end
  for (let z = completionMonth; z < noMonths; z++) {
    targetData.push(targetData[z - 1] * 1.01);
  }

  return targetData;
};

const calculateSourceData = (
  preCosts,
  compellingEventMonth,
  completionMonth,
  noMonths,
  increasePercAfterComplete
) => {
  // create array for source
  const sourceData = [];

  // there are 3 key ramping events
  // - compelling event
  // - prior to the peak cost
  // - peak cost

  // push data up to the compelling event
  // we assume max 5% of the total, with a linear increment
  const compellingEventMonthCost = preCosts * 0.05;
  const compellingEventMonthIncrement =
    compellingEventMonthCost / compellingEventMonth;
  for (let z = 0; z < compellingEventMonth; z++) {
    if (z === 0) {
      sourceData.push(compellingEventMonthIncrement);
    } else {
      sourceData.push(compellingEventMonthIncrement + sourceData[z - 1]);
    }
  }

  // we need to create a datapoint before the migration is complete for another ramp
  // use the compelling event month period subtracted from the completion month
  const datapoint2Index = completionMonth - compellingEventMonth;
  const incrementsBetweenCompellingEventAndDp2 =
    datapoint2Index - compellingEventMonth;
  // there is about a 15% difference before peak and a gradual ramp
  const datapoint2Cost = preCosts * 0.85;
  const datapoint2Increment =
    datapoint2Cost / incrementsBetweenCompellingEventAndDp2;

  for (let z = compellingEventMonth; z < datapoint2Index; z++) {
    if (z === datapoint2Index - 1) {
      sourceData.push(datapoint2Cost);
    } else {
      sourceData.push(sourceData[z - 1] + datapoint2Increment);
    }
  }

  // increment between dp2 and the completion month
  const incrementsBetweenDp2AndCompletionMonth =
    completionMonth - datapoint2Index;
  const peakIncrement =
    (preCosts - datapoint2Cost) / incrementsBetweenDp2AndCompletionMonth;

  for (let z = datapoint2Index; z < completionMonth; z++) {
    if (z === completionMonth - 1) {
      sourceData.push(preCosts);
    } else {
      sourceData.push(peakIncrement + sourceData[z - 1]);
    }
  }

  // make a 1% increment to the end
  for (let z = completionMonth; z < noMonths; z++) {
    sourceData.push(sourceData[z - 1] * increasePercAfterComplete);
  }

  return sourceData;
};

export default class CostAnalysis extends React.PureComponent {
  render() {
    return (
      <CostProvider>
        <CostConsumer>
          {({
            compellingEventMonth,
            completionMonth,
            noMonths,
            increasePercAfterComplete
          }) => (
            <DataConsumer>
              {({ workloads, tagSelection }) => {
                const filteredWorkloads = tagFilterWorkloads(
                  workloads,
                  tagSelection
                );

                const migrationData = calculateMigrationData(
                  filteredWorkloads,
                  { key: 4, label: 'YEARLY', value: 'Y' }
                );

                const preCosts =
                  parseFloat(migrationData.costs.totalCloudCostPre) +
                  parseFloat(migrationData.costs.totalDatacenterCostPre);
                const postCosts = parseFloat(
                  migrationData.costs.projectedCloudCost
                );

                const sourceData = calculateSourceData(
                  preCosts,
                  compellingEventMonth,
                  completionMonth,
                  noMonths,
                  increasePercAfterComplete
                );

                const targetData = calculateTargetData(
                  postCosts,
                  completionMonth,
                  noMonths
                );

                const panes = [
                  {
                    menuItem: 'Setup',
                    render: () => (
                      <Tab.Pane attached={false}>
                        <CostSetup />
                      </Tab.Pane>
                    )
                  },
                  {
                    menuItem: 'Cash Flow Milestones',
                    render: () => (
                      <Tab.Pane attached={false}>
                        <CashFlowMilestones
                          preCosts={preCosts}
                          postCosts={postCosts}
                          sourceData={sourceData}
                          targetData={targetData}
                        />
                      </Tab.Pane>
                    )
                  },
                  {
                    menuItem: 'Annual Ongoing Cost',
                    render: () => (
                      <AnnualOngoingCosts
                        sourceData={sourceData}
                        targetData={targetData}
                        completionMonth={completionMonth}
                      />
                    )
                  },
                  {
                    menuItem: 'Investment Summary',
                    render: () => (
                      <Tab.Pane attached={false}>Tab 3 Content</Tab.Pane>
                    )
                  }
                ];

                return (
                  <Grid>
                    <Grid.Row>
                      <Grid.Column style={{ paddingTop: '15px' }}>
                        <Header as="h3" content="Cost Analysis" />

                        <Message floating style={{ borderRadius: 0 }}>
                          <Message.Header>
                            Summarized cost analysis for the targetted
                            workloads.
                          </Message.Header>
                          <Message.List>
                            <Message.Item>
                              Use the tag filter to dynamically filter the cost
                              analysis generated below.
                            </Message.Item>
                            <Message.Item>
                              The cost period will dynamically adjust the
                              figures seen below.
                            </Message.Item>
                          </Message.List>
                        </Message>
                        <Divider />
                      </Grid.Column>
                    </Grid.Row>

                    <LiveSpend />

                    {/* <Grid.Row columns="equal" style={{ paddingTop: '0px' }}>
                      <Grid.Column>
                        <Tab
                          menu={{ pointing: true, secondary: true }}
                          panes={panes}
                        />
                      </Grid.Column>
                    </Grid.Row> */}
                  </Grid>
                );
              }}
            </DataConsumer>
          )}
        </CostConsumer>
      </CostProvider>
    );
  }
}
