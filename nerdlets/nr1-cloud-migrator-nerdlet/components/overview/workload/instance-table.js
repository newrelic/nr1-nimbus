import React from 'react';
import { Table, Radio, Header } from 'semantic-ui-react';
import { nrTableHeaderCell } from '../../../css/style';
import { adjustCostValue } from '../../../context/helper';
import { formatValue, getCheapestMatch } from '../../../../shared/lib/utils';
import { navigation } from 'nr1';
import { DataConsumer } from '../../../context/data';

export default class InstanceTable extends React.PureComponent {
  // use instance result if available
  // else use exact matched instance
  // else fall back on next matched instance
  getInstanceResult = (instanceResult, instanceData) => {
    const instance = { type: '', cost: '' };

    if (instanceResult) {
      instance.type = instanceResult.type;
      instance.cost = instanceResult.onDemandPrice;
    } else if (
      instanceData &&
      (instanceData.exactMatchedProducts || instanceData.nextMatchedProducts)
    ) {
      const cheapestExactMatch = getCheapestMatch(
        instanceData.exactMatchedProducts
      );
      if (cheapestExactMatch) {
        instance.type = cheapestExactMatch.type;
        instance.cost = cheapestExactMatch.onDemandPrice;
      } else {
        const cheapestNextMatch = getCheapestMatch(
          instanceData.nextMatchedProducts
        );
        instance.type = cheapestNextMatch.type;
        instance.cost = cheapestNextMatch.onDemandPrice;
      }

      // const exactMatchedProducts = Object.keys(
      //   instanceData.exactMatchedProducts || {}
      // );
      // const nextMatchedProducts = Object.keys(
      //   instanceData.nextMatchedProducts || {}
      // );

      // let categories = [];
      // let selection = '';
      // if (exactMatchedProducts.length > 0) {
      //   selection = 'exactMatchedProducts';
      //   categories = exactMatchedProducts;
      // } else if (nextMatchedProducts.length > 0) {
      //   selection = 'nextMatchedProducts';
      //   categories = nextMatchedProducts;
      // }

      // for (let z = 0; z < categories.length; z++) {
      //   instance.type = instanceData[selection][categories[z]].type;
      //   instance.cost = instanceData[selection][categories[z]].onDemandPrice;
      //   break;
      // }

      // if (!instance.type) {
      //   const categories = Object.keys(instanceData[selection]);

      //   for (let z = 0; z < categories.length; z++) {
      //     instance.type = instanceData[selection][categories[z]].type;
      //     instance.cost = instanceData[selection][categories[z]].onDemandPrice;
      //     break;
      //   }
      // }
    }

    return instance;
  };

  render() {
    const {
      optimizedCfgEnabled,
      entityData,
      excludedGuids,
      updateExcludedGuid
    } = this.props;

    return (
      <DataConsumer>
        {({ costPeriod, selectedMigration }) => {
          if (entityData.length === 0) {
            return (
              <Header as="h4">
                No entities reporting. Add entities to your{' '}
                <a
                  onClick={() =>
                    window.open(
                      ` https://one.newrelic.com/redirect/entity/${selectedMigration.guid}`,
                      '_blank'
                    )
                  }
                >
                  workload.
                </a>
              </Header>
            );
          }

          const renderOptimizedSuggestions = (
            optimizedInstance,
            guid,
            excluded
          ) => {
            if (optimizedInstance.state !== '-') {
              const cellNegative = !optimizedInstance.state.includes(
                'optimize'
              );

              const cellPositive = optimizedInstance.state.includes('optimize');

              return (
                <>
                  <Table.Cell
                    textAlign="right"
                    negative={cellNegative}
                    positive={cellPositive}
                  >
                    {optimizedInstance.type}
                  </Table.Cell>
                  <Table.Cell
                    textAlign="right"
                    negative={cellNegative}
                    positive={cellPositive}
                  >
                    {optimizedInstance.type
                      ? `$${formatValue(
                          adjustCostValue(
                            costPeriod.value,
                            optimizedInstance.cost
                          ),
                          2
                        )}`
                      : ''}
                  </Table.Cell>
                  <Table.Cell
                    negative={cellNegative}
                    positive={cellPositive}
                    textAlign="center"
                  >
                    <Radio
                      slider
                      checked={excluded}
                      onChange={(e, d) =>
                        updateExcludedGuid(guid, d.checked, excludedGuids)
                      }
                    />
                  </Table.Cell>
                </>
              );
            }

            return (
              <Table.Cell colSpan="3" style={{ textAlign: 'center' }}>
                No suggestion
              </Table.Cell>
            );
          };

          return (
            <Table compact>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell style={nrTableHeaderCell}>
                    Name
                  </Table.HeaderCell>
                  <Table.HeaderCell style={nrTableHeaderCell} textAlign="right">
                    CPU Cores
                  </Table.HeaderCell>
                  <Table.HeaderCell style={nrTableHeaderCell} textAlign="right">
                    Mem GB
                  </Table.HeaderCell>
                  <Table.HeaderCell style={nrTableHeaderCell} textAlign="right">
                    Max CPU %
                  </Table.HeaderCell>
                  <Table.HeaderCell style={nrTableHeaderCell} textAlign="right">
                    Max Mem %
                  </Table.HeaderCell>
                  <Table.HeaderCell style={nrTableHeaderCell} textAlign="right">
                    Cost
                  </Table.HeaderCell>
                  <Table.HeaderCell style={nrTableHeaderCell} textAlign="right">
                    Matched Instance Type
                  </Table.HeaderCell>
                  <Table.HeaderCell style={nrTableHeaderCell} textAlign="right">
                    Matched Instance Cost
                  </Table.HeaderCell>
                  {optimizedCfgEnabled ? (
                    <>
                      <Table.HeaderCell
                        style={nrTableHeaderCell}
                        textAlign="right"
                      >
                        Optimized Instance Type
                      </Table.HeaderCell>
                      <Table.HeaderCell
                        style={nrTableHeaderCell}
                        textAlign="right"
                      >
                        Optimized Instance Cost
                      </Table.HeaderCell>
                      <Table.HeaderCell
                        style={nrTableHeaderCell}
                        textAlign="center"
                      >
                        SKIP
                      </Table.HeaderCell>
                    </>
                  ) : (
                    <></>
                  )}
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {entityData.map(entity => {
                  // get cloud cost (currently aws) or datacenter cu cost
                  const cost =
                    ((entity || {}).instanceResult || {}).onDemandPrice ||
                    entity.DatacenterCUCost ||
                    0;

                  const matchedInstance = {
                    type: '',
                    cost: 0
                  };

                  const matchedInstanceResult = this.getInstanceResult(
                    entity.instanceResult,
                    entity.matchedInstances
                  );
                  matchedInstance.type = matchedInstanceResult.type;
                  matchedInstance.cost = matchedInstanceResult.cost;

                  const optimizedInstance = {
                    type: null,
                    cost: 0,
                    state: null
                  };

                  if (optimizedCfgEnabled) {
                    const optimizedInstanceResult = this.getInstanceResult(
                      entity.instanceResult,
                      ((entity || {}).optimizedData || {}).matchedInstances ||
                        {}
                    );
                    optimizedInstance.type = optimizedInstanceResult.type;
                    optimizedInstance.cost = optimizedInstanceResult.cost;
                    optimizedInstance.state =
                      (entity.instanceResult,
                      ((entity || {}).optimizedData || {}).state || '-');

                    if (!optimizedInstance.state.includes('optimize')) {
                      optimizedInstance.type = optimizedInstance.state;
                      optimizedInstance.cost = 0;
                    }
                  }
                  // console.log(
                  //   optimizedInstanceResult,
                  //   matchedInstanceResult
                  // );

                  const results = [
                    ...entity.systemSample.results,
                    ...entity.vsphereVmSample.results
                  ];

                  return results.map((result, i) => {
                    const excluded = excludedGuids.includes(
                      result['latest.entityGuid']
                    );

                    if (!result['latest.entityGuid'])
                      return <React.Fragment key={i} />;
                    return (
                      <Table.Row key={i}>
                        <Table.Cell>
                          <a
                            onClick={() =>
                              navigation.openStackedEntity(
                                result['latest.entityGuid']
                              )
                            }
                          >
                            {result['latest.hostname'] ||
                              result['latest.vmConfigName']}
                          </a>
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          {result['latest.coreCount']}
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          {formatValue(
                            result['latest.memoryTotalBytes'] / 1e9,
                            2
                          )}
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          {result['max.cpuPercent'].toFixed(2)}
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          {result['max.memoryPercent'].toFixed(2)}
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          $
                          {formatValue(
                            adjustCostValue(costPeriod.value, cost),
                            2
                          )}
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          {matchedInstance.type}
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          $
                          {formatValue(
                            adjustCostValue(
                              costPeriod.value,
                              matchedInstance.cost
                            ),
                            2
                          )}
                        </Table.Cell>
                        {optimizedCfgEnabled ? (
                          renderOptimizedSuggestions(
                            optimizedInstance,
                            result['latest.entityGuid'],
                            excluded
                          )
                        ) : (
                          <></>
                        )}
                      </Table.Row>
                    );
                  });
                })}
              </Table.Body>
            </Table>
          );
        }}
      </DataConsumer>
    );
  }
}
