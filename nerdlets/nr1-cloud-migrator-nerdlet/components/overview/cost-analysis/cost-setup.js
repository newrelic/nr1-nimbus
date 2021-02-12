import React from 'react';
import { Message, Select } from 'semantic-ui-react';
import { CostConsumer } from '../../../context/cost';

export default class CostSetup extends React.PureComponent {
  render() {
    return (
      <CostConsumer>
        {({
          updateCostContext,
          noMonths,
          compellingEventMonth,
          completionMonth
          // increasePercAfterComplete
        }) => {
          const totalMonths = 60;
          const totalMonthsOptions = [];
          for (let z = completionMonth; z < totalMonths + 1; z++) {
            totalMonthsOptions.push({ key: z, text: z, value: z });
          }

          const howManyMonthsToComplete = [];
          for (let z = 1; z < noMonths + 1; z++) {
            howManyMonthsToComplete.push({ key: z, text: z, value: z });
          }

          const compellingEventOptions = [];
          for (let z = 0; z < noMonths && z < completionMonth; z++) {
            compellingEventOptions.push({ key: z, text: z, value: z });
          }

          const labelStyle = {
            float: 'left',
            fontSize: '14px',
            paddingTop: '10px',
            paddingBottom: '20px'
          };

          return (
            <div>
              <Message floating style={{ borderRadius: 0 }}>
                <Message.Header>Tell us about your migration.</Message.Header>
                <Message.List>
                  <Message.Item>
                    Updating the fields below will help dynamically generate
                    your cost analysis.
                  </Message.Item>
                </Message.List>
              </Message>

              <div
                style={{ width: '650px', height: '300px', paddingLeft: '20px' }}
              >
                <div>
                  <div style={labelStyle}>
                    How many months will your migration take?
                  </div>
                  <div style={{ display: 'grid', padding: '10px' }}>
                    <Select
                      style={{ width: '75px' }}
                      fluid
                      options={howManyMonthsToComplete}
                      placeholder="Months"
                      search
                      value={completionMonth}
                      onChange={(e, d) =>
                        updateCostContext({ completionMonth: d.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>
                    Over how many months will we observe your migration for?
                  </div>
                  <div style={{ display: 'grid', padding: '10px' }}>
                    <Select
                      style={{ width: '75px' }}
                      fluid
                      options={totalMonthsOptions}
                      placeholder="Months"
                      search
                      value={noMonths}
                      onChange={(e, d) =>
                        updateCostContext({ noMonths: d.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>
                    Select a month if a compelling event is taking place, eg.
                    hardware refresh?
                  </div>
                  <div style={{ display: 'grid', padding: '10px' }}>
                    <Select
                      style={{ width: '75px' }}
                      fluid
                      options={compellingEventOptions}
                      placeholder="Months"
                      search
                      value={compellingEventMonth}
                      onChange={(e, d) =>
                        updateCostContext({ compellingEventMonth: d.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      </CostConsumer>
    );
  }
}
