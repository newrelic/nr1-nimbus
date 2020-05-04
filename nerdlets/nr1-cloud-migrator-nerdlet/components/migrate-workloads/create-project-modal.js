import React from 'react';
import { Modal, Button, Form, Select } from 'semantic-ui-react';
import { DataConsumer, loadingMsg } from '../../context/data';
import {
  addTags,
  createPostMigrationWorkload
} from '../../../shared/lib/queries';
import { NerdGraphMutation } from 'nr1';
import { toast } from 'react-toastify';

toast.configure();

const makeId = l => {
  let id = '';
  const charList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < l; i++) {
    id += charList.charAt(Math.floor(Math.random() * charList.length));
  }
  return id;
};

export default class CreateWorkloadProject extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      projectName: '',
      cloud: '',
      tgtWorkloadGuid: '',
      datacenterGuid: '',
      accountId: '',
      open: false
    };
  }

  handleOpen = () => this.setState({ open: true });
  handleClose = () =>
    this.setState({
      open: false,
      projectName: '',
      cloud: '',
      region: '',
      tgtWorkloadGuid: '',
      datacenterGuid: '',
      accountId: ''
    });

  handleSave = async (selectedWorkload, dataFetcher) => {
    toast.info(loadingMsg('Creating workload...'), {
      autoClose: false,
      containerId: 'B',
      toastId: 'createWorkload'
    });

    const {
      accountId,
      projectName,
      cloud,
      region,
      datacenterGuid
    } = this.state;
    let { tgtWorkloadGuid } = this.state;
    const migrationId = makeId(8);

    const sharedTags = [
      {
        key: 'cloud',
        val: cloud
      },
      {
        key: 'region',
        val: region
      },
      {
        key: 'm.MigrationId',
        val: migrationId
      },
      {
        key: 'm.ProjectName',
        val: projectName
      }
    ];

    if (datacenterGuid) {
      sharedTags.push({ key: 'datacenterGuid', val: datacenterGuid });
    }

    // create a target workload automatically
    if (tgtWorkloadGuid === 'Automatic' || !tgtWorkloadGuid) {
      const createPostMigrationWorkloadResult = await NerdGraphMutation.mutate({
        mutation: createPostMigrationWorkload(
          accountId,
          selectedWorkload.name,
          migrationId
        )
      });

      const result =
        ((createPostMigrationWorkloadResult || {}).data || {}).workloadCreate ||
        null;

      if (result) {
        tgtWorkloadGuid = result.guid;
      }
    }

    const targetWorkloadTags = [...sharedTags];
    targetWorkloadTags.push({
      key: 'srcWorkloadGuid',
      val: selectedWorkload.guid
    });

    const srcWorkloadTags = [...sharedTags];
    srcWorkloadTags.push({
      key: 'tgtWorkloadGuid',
      val: tgtWorkloadGuid
    });

    const tagPromises = [];

    tagPromises.push(
      NerdGraphMutation.mutate({
        mutation: addTags(tgtWorkloadGuid, targetWorkloadTags)
      })
    );
    tagPromises.push(
      NerdGraphMutation.mutate({
        mutation: addTags(selectedWorkload.guid, srcWorkloadTags)
      })
    );

    await Promise.all(tagPromises);

    // sometimes tags are not available yet, so hold back fetching workloads straigh away
    setTimeout(async () => {
      await dataFetcher(['workloads']);

      toast.update('createWorkload', {
        render: 'Workload created.',
        type: toast.TYPE.SUCCESS,
        containerId: 'B',
        autoClose: 3000
      });

      this.handleClose();
    }, 5000);
  };

  render() {
    const {
      accountId,
      projectName,
      cloud,
      region,
      tgtWorkloadGuid,
      datacenterGuid,
      open
    } = this.state;
    const { selectedWorkload } = this.props;
    const availableClouds = [
      { key: 'amazon', text: 'Amazon', value: 'amazon' },
      { key: 'azure', text: 'Azure', value: 'azure' },
      { key: 'google', text: 'Google', value: 'google' }
    ];

    return (
      <DataConsumer>
        {({ accounts, workloads, cloudRegions, dataFetcher, datacenters }) => {
          const accountOptions = accounts.map(acc => ({
            key: acc.id,
            text: acc.name,
            value: acc.id
          }));

          const availableWorkloads = workloads
            .map(workload => ({
              key: workload.id,
              text: workload.name,
              value: workload.guid
            }))
            .filter(workload => workload.text !== selectedWorkload.name);

          availableWorkloads.unshift({
            key: 'Automatic',
            text: 'Automatic (default)',
            value: null
          });

          const availableDatacenters = datacenters.map(dc => ({
            key: dc.id,
            text: dc.name,
            value: dc.guid
          }));

          availableDatacenters.unshift({
            key: 'None',
            text: 'None',
            value: null
          });

          const availableRegions = (cloudRegions[cloud] || []).map(region => ({
            key: region.id,
            text: region.id,
            value: region.id
          }));

          return (
            <Modal
              open={open}
              onClose={this.handleClose}
              closeIcon
              trigger={
                <Button
                  circular
                  size="mini"
                  icon="cloud upload"
                  positive
                  content="&nbsp;&nbsp;Migrate"
                  style={{ float: 'right' }}
                  onClick={this.handleOpen}
                />

                // <Button
                //   onClick={this.handleOpen}
                //   icon
                //   basic
                //   labelPosition="left"
                //   style={{ float: 'right' }}
                // >
                //   <Icon className="clearIconButton" name="cloud upload" />
                //   Migrate
                // </Button>
              }
            >
              <Modal.Header>Migrate - {selectedWorkload.name}</Modal.Header>
              <Modal.Content>
                <Form>
                  <Form.Group widths={16}>
                    <Form.Field width={6}>
                      <label>Select New Relic Account</label>
                      <Select
                        className="singledrop"
                        search
                        value={accountId}
                        options={accountOptions}
                        onChange={(e, d) =>
                          this.setState({ accountId: d.value })
                        }
                      />
                    </Form.Field>

                    <Form.Field width={6}>
                      <label>Target Cloud</label>
                      <Select
                        className="singledrop"
                        search
                        value={cloud}
                        options={availableClouds}
                        onChange={(e, d) => this.setState({ cloud: d.value })}
                      />
                    </Form.Field>

                    <Form.Field width={6}>
                      <label>Target Region</label>
                      <Select
                        className="singledrop"
                        search
                        label="Target Region"
                        value={region}
                        options={availableRegions}
                        onChange={(e, d) => this.setState({ region: d.value })}
                      />
                    </Form.Field>
                  </Form.Group>

                  <Form.Group widths={16}>
                    <Form.Input
                      width={6}
                      label="Project Name"
                      placeholder="Name..."
                      value={projectName}
                      onChange={e =>
                        this.setState({ projectName: e.target.value })
                      }
                    />
                    <Form.Field width={6}>
                      <label>Datacenter</label>
                      <Select
                        className="singledrop"
                        search
                        width={6}
                        placeholder="Select Datacenter if available"
                        value={datacenterGuid}
                        options={availableDatacenters}
                        onChange={(e, d) =>
                          this.setState({ datacenterGuid: d.value })
                        }
                      />
                    </Form.Field>
                    <Form.Field width={6}>
                      <label>Target Cloud Workload</label>
                      <Select
                        className="singledrop"
                        search
                        width={6}
                        placeholder="Select a manual target if required"
                        value={tgtWorkloadGuid}
                        options={availableWorkloads}
                        onChange={(e, d) =>
                          this.setState({ tgtWorkloadGuid: d.value })
                        }
                      />
                    </Form.Field>
                  </Form.Group>
                  <Form.Group style={{ float: 'right' }}>
                    <Form.Button
                      positive
                      content="Create Project"
                      disabled={
                        accountId === '' ||
                        projectName === '' ||
                        cloud === '' ||
                        region === ''
                      }
                      onClick={() =>
                        this.handleSave(selectedWorkload, dataFetcher)
                      }
                    />
                  </Form.Group>
                </Form>
              </Modal.Content>
            </Modal>
          );
        }}
      </DataConsumer>
    );
  }
}
