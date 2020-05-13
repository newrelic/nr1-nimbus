import React from 'react';
import {
  Grid,
  Header,
  Statistic,
  Message,
  Divider,
  Form,
  Button,
  Radio,
  Segment,
  Dropdown,
  Table,
  Icon
} from 'semantic-ui-react';
import { DataConsumer } from '../../../context/data';
import { adjustCostValue } from '../../../context/helper';
import {
  formatValue,
  calculateMigrationData,
  writeEntityDocument,
  getEntityCollection
} from '../../../../shared/lib/utils';
import InstanceTable from './instance-table';

const defaults = {
  enable: false,
  inclusionPeriodHours: 24,
  cpuUpper: 50,
  memUpper: 50,
  cpuMemUpperOperator: 'AND',
  staleCpu: 5,
  staleMem: 5,
  cpuMemUpperStaleOperator: 'AND',
  staleReceiveBytesPerSec: 0,
  staleTransmitBytesPerSec: 0,
  rxTxStaleOperator: 'AND',
  cpuRightSize: 0.5,
  memRightSize: 0.5,
  rightSizeOperator: '',
  discountMultiplier: 1,
  lastReportPeriod: 24,
  includedInstanceTypes: [],
  excludedInstanceTypes: [],
  excludedGuids: []
};

export default class WorkloadOverview extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      updating: false,
      showConfig: false,
      selectedMigration: null
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.selectedMigration !== prevProps.selectedMigration) {
      this.didUpdate(this.props.selectedMigration);
    }
  }

  updateExcludedGuid = (guid, checked, excludedGuids) => {
    if (checked) {
      excludedGuids.push(guid);
    } else {
      for (let z = 0; z < excludedGuids.length; z++) {
        if (excludedGuids[z] === guid) {
          excludedGuids.splice(z, 1);
          break;
        }
      }
    }

    this.setState({ excludedGuids: [...excludedGuids] });
  };

  didUpdate = async (selectedMigration, updating, guid) => {
    const tmpState = { ...this.state };

    const d = await getEntityCollection(
      'optimizationConfig',
      guid || selectedMigration.guid,
      'main'
    );
    if (d) {
      Object.keys(d).forEach(k => {
        tmpState[k] = d[k];
      });
    } else {
      Object.keys(tmpState).forEach(k => {
        tmpState[k] = null;
      });
    }

    tmpState.updating = updating !== null ? updating : this.state.updating;

    tmpState.selectedMigration =
      selectedMigration !== null
        ? selectedMigration
        : this.state.selectedMigration;
    this.setState(tmpState, () => {
      this.setState({ showConfig: false });
    });
  };

  saveDocument = (
    guid,
    dataFetcher,
    enable,
    inclusionPeriodHours,
    cpuUpper,
    memUpper,
    cpuMemUpperOperator,
    cpuMemUpperStaleOperator,
    staleCpu,
    staleMem,
    staleReceiveBytesPerSec,
    staleTransmitBytesPerSec,
    memRightSize,
    cpuRightSize,
    includedInstanceTypes,
    excludedInstanceTypes,
    excludedGuids
  ) => {
    const valueCheck = (val, name) => {
      if (val !== null && val !== undefined) return val;
      return defaults[name];
    };

    const payload = {
      enable: enable || defaults.enable,
      inclusionPeriodHours: parseFloat(
        inclusionPeriodHours || defaults.inclusionPeriodHours
      ),
      cpuUpper: parseFloat(valueCheck(cpuUpper, 'cpuUpper')),
      memUpper: parseFloat(valueCheck(memUpper, 'memUpper')),
      staleCpu: parseFloat(valueCheck(staleCpu, 'staleCpu')),
      staleMem: parseFloat(valueCheck(staleMem, 'staleMem')),
      cpuMemUpperOperator: cpuMemUpperOperator || defaults.cpuMemUpperOperator,
      cpuMemUpperStaleOperator:
        cpuMemUpperStaleOperator || defaults.cpuMemUpperStaleOperator,
      staleReceiveBytesPerSec: parseFloat(
        valueCheck(staleReceiveBytesPerSec, 'staleReceiveBytesPerSec')
      ),
      staleTransmitBytesPerSec: parseFloat(
        valueCheck(staleTransmitBytesPerSec, 'staleTransmitBytesPerSec')
      ),
      cpuRightSize: parseFloat(valueCheck(cpuRightSize, 'cpuRightSize')),
      memRightSize: parseFloat(valueCheck(memRightSize, 'memRightSize')),
      excludedInstanceTypes:
        excludedInstanceTypes || defaults.excludedInstanceTypes,
      includedInstanceTypes:
        includedInstanceTypes || defaults.includedInstanceTypes,
      excludedGuids: excludedGuids || defaults.excludedGuids
    };

    this.setState({ updating: true }, async () => {
      await writeEntityDocument(guid, 'optimizationConfig', 'main', payload);
      await dataFetcher(['workloads']);
      this.didUpdate(null, false, guid);
    });
  };

  handleUpdate = (e, d) => {
    this.setState({ [d.id]: d.value });
  };

  handleAddition = async (e, d, arr) => {
    const temp = [...arr];
    const exists = temp.filter(v => v.text === d.value);
    if (!exists[0]) temp.push({ text: d.value, value: d.value });
    this.setState({ [d.id]: temp });
  };

  handleChange = async (e, d) => {
    const temp = d.value.map(v => ({
      text: v,
      value: v
    }));
    this.setState({ [d.id]: temp });
  };

  render() {
    const { selectedMigration } = this.props;
    return (
      <DataConsumer>
        {({ pluckWorkload, costPeriod, dataFetcher }) => {
          const selected = pluckWorkload(selectedMigration.guid);
          if (!selected.data) return 'Loading please be patient.';

          const { updating, showConfig } = this.state;

          const handleValue = name => {
            if (this.state[name] !== null && this.state[name] !== undefined) {
              return this.state[name];
            }

            const cfgValue = (selected.optimizationConfig || {})[name] || null;
            if (cfgValue !== undefined && cfgValue !== null) {
              return cfgValue;
            }

            return defaults[name];
          };

          const enable = handleValue('enable');
          const cpuUpper = handleValue('cpuUpper');
          const memUpper = handleValue('memUpper');
          const staleCpu = handleValue('staleCpu');
          const staleMem = handleValue('staleMem');
          const staleReceiveBytesPerSec = handleValue(
            'staleReceiveBytesPerSec'
          );
          const staleTransmitBytesPerSec = handleValue(
            'staleTransmitBytesPerSec'
          );
          const cpuMemUpperOperator = handleValue('cpuMemUpperOperator');
          const cpuMemUpperStaleOperator = handleValue(
            'cpuMemUpperStaleOperator'
          );
          const inclusionPeriodHours = handleValue('inclusionPeriodHours');
          const cpuRightSize = handleValue('cpuRightSize');
          const memRightSize = handleValue('memRightSize');
          const excludedInstanceTypes = handleValue('excludedInstanceTypes');
          const excludedInstanceOptions = excludedInstanceTypes.map(
            d => d.value
          );
          const includedInstanceTypes = handleValue('includedInstanceTypes');
          // const includedInstanceOptions = excludedInstanceTypes.map(
          //   d => d.value
          // );
          const excludedGuids = handleValue('excludedGuids');

          const workloadCost =
            ((selected.data || {}).totalOnDemandCost || 0) +
            ((selected.data || {}).totalDatacenterCUCost || 0);

          const migrationData = calculateMigrationData([selected], costPeriod);
          // console.log(selected.data, migrationData);

          const optimizedCfgEnabled =
            (selected.optimizationConfig || {}).enable || false;

          let hostCount = 0;
          if (((migrationData || {}).entityProgressNumeric || {}).src || null) {
            hostCount +=
              migrationData.entityProgressNumeric.src
                .INFRASTRUCTURE_HOST_ENTITY || 0;
            // hostCount +=
            //   migrationData.entityProgressNumeric.src.VSPHEREHOST || 0;
            hostCount += migrationData.entityProgressNumeric.src.VSPHEREVM || 0;
          }

          return (
            <Grid>
              <Grid.Row>
                <Grid.Column style={{ paddingTop: '15px' }}>
                  <Header as="h3">Workload Overview</Header>

                  <Message floating style={{ borderRadius: 0 }}>
                    <Message.Header>
                      Understand what is in your workload, and what you should
                      look at before migration.
                    </Message.Header>
                    <Message.List>
                      <Message.Item>
                        Optionally enable the below configuration if you would
                        like to fine tune the suggestions provided.
                      </Message.Item>
                    </Message.List>
                  </Message>

                  <Radio
                    style={{ paddingTop: '7px' }}
                    toggle
                    label={
                      showConfig ? 'Hide configuration' : 'Show configuration'
                    }
                    checked={showConfig}
                    onChange={() =>
                      this.setState({
                        showConfig: !showConfig
                      })
                    }
                  />
                  <br />
                  <br />

                  <Segment
                    style={{
                      display: showConfig ? '' : 'none',
                      margin: '8px'
                    }}
                    color="blue"
                    raised
                  >
                    <Form style={{ padding: '10px' }}>
                      <Header as="h3">Configuration</Header>
                      <Form.Field inline>
                        <label style={{ width: '230px' }}>
                          Inclusion Period (hours)
                        </label>
                        <Form.Input
                          id="inclusionPeriodHours"
                          inverted={false}
                          value={inclusionPeriodHours}
                          onChange={this.handleUpdate}
                        />
                      </Form.Field>
                      <label>
                        The instance needs to have reported at least once within
                        this period.
                      </label>
                      <Divider />

                      <Form.Group widths={4}>
                        <Form.Input
                          label="CPU Percent"
                          value={cpuUpper}
                          id="cpuUpper"
                          onChange={this.handleUpdate}
                          type="number"
                        />
                        <Form.Select
                          label="Operator"
                          id="cpuMemUpperOperator"
                          value={cpuMemUpperOperator}
                          options={[
                            {
                              key: 'AND',
                              text: 'AND',
                              value: 'AND'
                            },
                            {
                              key: 'OR',
                              text: 'OR',
                              value: 'OR'
                            }
                          ]}
                          onChange={this.handleUpdate}
                        />
                        <Form.Input
                          label="Memory Percent"
                          value={memUpper}
                          id="memUpper"
                          onChange={this.handleUpdate}
                          type="number"
                        />
                      </Form.Group>
                      <label>
                        If the instance is below any of these metrics, provide
                        an optimized suggestion. Setting as 0 will disable the
                        check.
                      </label>
                      <Divider />

                      <Form.Group widths="equal">
                        <Form.Input
                          label="CPU Percent"
                          value={staleCpu}
                          id="staleCpu"
                          onChange={this.handleUpdate}
                          type="number"
                        />
                        <Form.Select
                          label="Operator"
                          id="cpuMemUpperStaleOperator"
                          value={cpuMemUpperStaleOperator}
                          options={[
                            {
                              key: 'AND',
                              text: 'AND',
                              value: 'AND'
                            },
                            {
                              key: 'OR',
                              text: 'OR',
                              value: 'OR'
                            }
                          ]}
                          onChange={this.handleUpdate}
                        />
                        <Form.Input
                          label="Memory Percent"
                          value={staleMem}
                          id="staleMem"
                          onChange={this.handleUpdate}
                          type="number"
                        />
                        <Form.Input
                          label="Receive Bytes Per Second"
                          value={staleReceiveBytesPerSec}
                          id="staleReceiveBytesPerSec"
                          onChange={this.handleUpdate}
                          type="number"
                        />
                        <Form.Input
                          label="Transmit Bytes Per Second"
                          value={staleTransmitBytesPerSec}
                          id="staleTransmitBytesPerSec"
                          onChange={this.handleUpdate}
                          type="number"
                        />
                      </Form.Group>
                      <label>
                        If the instance is below any of these metrics mark as
                        stale. Setting as 0 will disable the check.
                      </label>
                      <Divider />

                      <Form.Field>
                        <label>Exclude Instance Types</label>
                        <Dropdown
                          // style={{ position: 'relative' }}
                          id="excludedInstanceTypes"
                          search
                          selection
                          fluid
                          multiple
                          allowAdditions
                          value={excludedInstanceOptions}
                          options={excludedInstanceTypes}
                          onChange={this.handleChange}
                          onAddItem={(e, d) =>
                            this.handleAddition(e, d, excludedInstanceTypes)
                          }
                        />
                      </Form.Field>
                      <label>
                        Filter instance types out, eg. &quot;t2&quot;.
                      </label>

                      <Divider />

                      <Form.Group widths={4}>
                        <Form.Input
                          label="Right Size CPU %"
                          value={cpuRightSize}
                          id="cpuRightSize"
                          onChange={this.handleUpdate}
                          type="number"
                        />
                        <Form.Input
                          label="Right Size Memory %"
                          value={memRightSize}
                          id="memRightSize"
                          onChange={this.handleUpdate}
                          type="number"
                        />
                      </Form.Group>
                      <label>
                        Based on these values, the instance CPU and Memory will
                        be multiplied respectively to determine a new instance
                        type. Given it becomes an optimization candidate.
                      </label>
                    </Form>

                    <div style={{ padding: '10px' }}>
                      <Radio
                        style={{ paddingTop: '7px' }}
                        toggle
                        label="Enable configuration"
                        checked={enable}
                        onChange={() => this.setState({ enable: !enable })}
                      />
                      <Button
                        compact
                        style={{ float: 'right' }}
                        content="Save configuration"
                        icon="save"
                        color="green"
                        loading={updating}
                        onClick={() =>
                          this.saveDocument(
                            selectedMigration.guid,
                            dataFetcher,
                            enable,
                            inclusionPeriodHours,
                            cpuUpper,
                            memUpper,
                            cpuMemUpperOperator,
                            cpuMemUpperStaleOperator,
                            staleCpu,
                            staleMem,
                            staleReceiveBytesPerSec,
                            staleTransmitBytesPerSec,
                            memRightSize,
                            cpuRightSize,
                            includedInstanceTypes,
                            excludedInstanceTypes,
                            excludedGuids
                          )
                        }
                      />
                    </div>
                  </Segment>
                </Grid.Column>
              </Grid.Row>

              <Divider />

              <Grid.Row>
                <Grid.Column>
                  <Statistic.Group>
                    {/* filter to hosts and vms */}
                    <Statistic horizontal size="small">
                      <Statistic.Value>{hostCount}</Statistic.Value>
                      <Statistic.Label>Hosts</Statistic.Label>
                    </Statistic>

                    <Statistic horizontal size="small">
                      <Statistic.Value>
                        $
                        {formatValue(
                          adjustCostValue(costPeriod.value, workloadCost),
                          2
                        )}
                      </Statistic.Value>
                      <Statistic.Label>Current Estimated Spend</Statistic.Label>
                    </Statistic>

                    <Statistic horizontal size="small">
                      <Statistic.Value>
                        $
                        {formatValue(migrationData.costs.projectedCloudCost, 2)}
                      </Statistic.Value>
                      <Statistic.Label>Projected Cloud Spend</Statistic.Label>
                    </Statistic>
                  </Statistic.Group>
                </Grid.Column>
              </Grid.Row>

              <Divider />

              <Grid.Row>
                <Grid.Column>
                  <InstanceTable
                    optimizedCfgEnabled={optimizedCfgEnabled}
                    excludedGuids={excludedGuids}
                    updateExcludedGuid={this.updateExcludedGuid}
                    entityData={selected.data.entityData}
                  />

                  {optimizedCfgEnabled ? (
                    <Table>
                      <Table.Body>
                        <Table.Row>
                          <Table.Cell colSpan={12}>
                            <span>
                              <Icon color="blue" name="info" />
                              &nbsp; Skipped instances will ignore the
                              optimization suggestion and have their matched
                              instance cost used. Click update when ready to
                              reflect the changes.
                            </span>
                            <Button
                              style={{ float: 'right' }}
                              circular
                              size="mini"
                              color="green"
                              content="Update"
                              onClick={() =>
                                this.saveDocument(
                                  selectedMigration.guid,
                                  dataFetcher,
                                  enable,
                                  inclusionPeriodHours,
                                  cpuUpper,
                                  memUpper,
                                  cpuMemUpperOperator,
                                  cpuMemUpperStaleOperator,
                                  staleCpu,
                                  staleMem,
                                  staleReceiveBytesPerSec,
                                  staleTransmitBytesPerSec,
                                  memRightSize,
                                  cpuRightSize,
                                  includedInstanceTypes,
                                  excludedInstanceTypes,
                                  excludedGuids
                                )
                              }
                            />
                          </Table.Cell>
                        </Table.Row>
                      </Table.Body>
                    </Table>
                  ) : (
                    <></>
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
