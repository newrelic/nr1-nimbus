// this calculation is derived from the AWS directional business case from key account examples
import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Header } from 'semantic-ui-react';
import { CostConsumer } from '../../../context/cost';

// const plugins = [
//   {
//     afterDraw: (chartInstance, easing) => {
//       const ctx = chartInstance.chart.ctx;
//       ctx.fillText('Custom graph draw', 100, 100);
//     }
//   }
// ];

export default class CashFlowMilestones extends React.PureComponent {
  render() {
    return (
      <CostConsumer>
        {({ noMonths, completionMonth }) => {
          const { preCosts, postCosts, sourceData, targetData } = this.props;

          const upperCost = Math.round(
            postCosts > preCosts ? postCosts : preCosts
          ); // used for the migration complete bar

          // create labels for each month
          const monthLabels = [];
          for (let z = 0; z < noMonths; z++) {
            monthLabels.push(`${z + 1}`);
          }

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
                  labels: monthLabels
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

          // determine payback
          const paybackAchievedData = [];
          for (let z = 0; z < sourceData.length; z++) {
            if (z > 0 && sourceData[z] >= targetData[z]) {
              paybackAchievedData[z] = sourceData[z];
              break;
            }
          }

          // use a bar as the indicator line
          // need to determine max spend first, but default to 50 for testing
          const migrationCompleteData = [];
          for (let z = 0; z < completionMonth; z++) {
            if (z + 1 === completionMonth) {
              migrationCompleteData.push(upperCost);
            } else {
              migrationCompleteData.push(0);
            }
          }

          const data = {
            datasets: [
              {
                label: 'Source Environment Spend',
                type: 'line',
                data: sourceData,
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
                label: 'Target Environment Spend',
                type: 'line',
                data: targetData,
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
                type: 'bar',
                label: 'Payback Achieved',
                data: paybackAchievedData,
                fill: false,
                backgroundColor: '#71B37C',
                borderColor: '#71B37C',
                hoverBackgroundColor: '#71B37C',
                hoverBorderColor: '#71B37C',
                yAxisID: 'y-axis-1'
              },
              {
                type: 'bar',
                label: 'Migration Complete',
                data: migrationCompleteData,
                fill: false,
                backgroundColor: '#36A2EB',
                borderColor: '#36A2EB',
                hoverBackgroundColor: '#36A2EB',
                hoverBorderColor: '#36A2EB',
                yAxisID: 'y-axis-1'
              }
            ]
          };

          return (
            <div style={{ height: '500px', paddingBottom: '50px' }}>
              <Header as="h5">Cash Flow Milestones - {noMonths} months</Header>
              <Bar
                data={data}
                options={options}
                height={50}
                style={{ paddingBottom: '10px' }}
              />
              {/* plugins={plugins}  */}
            </div>
          );
        }}
      </CostConsumer>
    );
  }
}
