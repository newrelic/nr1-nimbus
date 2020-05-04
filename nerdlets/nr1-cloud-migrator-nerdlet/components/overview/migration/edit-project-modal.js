import React from 'react';
import { Modal, Icon, Form, Select } from 'semantic-ui-react';
import { DataConsumer, loadingMsg } from '../../../context/data';
import { addTags, deleteTags } from '../../../../shared/lib/queries';
import { getTagValue } from '../../../../shared/lib/utils';
import { NerdGraphMutation } from 'nr1';
import { toast } from 'react-toastify';

toast.configure();

const defaults = {
  cloud: null,
  tgtWorkloadGuid: null,
  datacenterGuid: null
};

export default class EditWorkloadProject extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      updating: false
    };
  }

  handleOpen = () => this.setState({ open: true });
  handleClose = () =>
    this.setState({
      open: false,
      updating: false,
      cloud: null,
      region: null,
      tgtWorkloadGuid: null,
      datacenterGuid: null
    });

  handleSave = (
    selectedWorkload,
    dataFetcher,
    cloud,
    region,
    datacenterGuid,
    tgtWorkloadGuid
  ) => {
    this.setState({ updating: true }, async () => {
      toast.info(loadingMsg('Updating workload...'), {
        autoClose: false,
        containerId: 'B',
        toastId: 'updateWorkload'
      });

      const tagsToDelete = ['cloud', 'region'];
      const sharedTags = [
        {
          key: 'cloud',
          val: cloud
        },
        {
          key: 'region',
          val: region
        }
      ];

      if (datacenterGuid) {
        sharedTags.push({ key: 'datacenterGuid', val: datacenterGuid });
        tagsToDelete.push('datacenterGuid');
      }

      // delete previous tags
      const deleteTagPromises = [];
      deleteTagPromises.push(
        NerdGraphMutation.mutate({
          mutation: deleteTags(tgtWorkloadGuid, tagsToDelete)
        })
      );
      deleteTagPromises.push(
        NerdGraphMutation.mutate({
          mutation: deleteTags(selectedWorkload.guid, tagsToDelete)
        })
      );
      await Promise.all(deleteTagPromises);

      // add tags
      const tagPromises = [];
      tagPromises.push(
        NerdGraphMutation.mutate({
          mutation: addTags(tgtWorkloadGuid, sharedTags)
        })
      );
      tagPromises.push(
        NerdGraphMutation.mutate({
          mutation: addTags(selectedWorkload.guid, sharedTags)
        })
      );
      await Promise.all(tagPromises);

      // sometimes tags are not available yet, so hold back fetching workloads straigh away
      setTimeout(async () => {
        await dataFetcher(['workloads']);

        toast.update('updateWorkload', {
          render: 'Updated workload.',
          type: toast.TYPE.SUCCESS,
          containerId: 'B',
          autoClose: 3000
        });

        this.handleClose();
      }, 5000);
    });
  };

  render() {
    const { open, updating } = this.state;
    const { selected } = this.props;

    return (
      <DataConsumer>
        {({
          workloads,
          cloudRegions,
          dataFetcher,
          datacenters,
          pluckWorkload
        }) => {
          const selectedWorkload = pluckWorkload(selected.guid);

          const handleValue = name => {
            if (this.state[name] !== null && this.state[name] !== undefined) {
              return this.state[name];
            }

            const cfgValue = getTagValue(selectedWorkload.tags, name) || null;
            if (cfgValue !== undefined && cfgValue !== null) {
              return cfgValue;
            }

            return defaults[name];
          };

          const cloud = handleValue('cloud');
          const region = handleValue('region');
          const tgtWorkloadGuid = handleValue('tgtWorkloadGuid');
          const datacenterGuid = handleValue('datacenterGuid');

          const availableClouds = [
            { key: 'amazon', text: 'Amazon', value: 'amazon' },
            { key: 'azure', text: 'Azure', value: 'azure' },
            { key: 'google', text: 'Google', value: 'google' }
          ];

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
                <Icon
                  name="pencil"
                  style={{ float: 'right', cursor: 'pointer' }}
                  onClick={this.handleOpen}
                />
              }
            >
              <Modal.Header>Edit - {selectedWorkload.name}</Modal.Header>
              <Modal.Content>
                <Form>
                  <Form.Group widths={16}>
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

                    <Form.Field width={6}>
                      <label>Datacenter</label>
                      <Select
                        className="singledrop"
                        search
                        width={8}
                        placeholder="Select Datacenter if available"
                        value={datacenterGuid}
                        options={availableDatacenters}
                        onChange={(e, d) =>
                          this.setState({ datacenterGuid: d.value })
                        }
                      />
                    </Form.Field>
                  </Form.Group>
                  <Form.Group style={{ float: 'right' }}>
                    <Form.Button
                      positive
                      content="Update"
                      loading={updating}
                      disabled={cloud === '' || region === ''}
                      onClick={() =>
                        this.handleSave(
                          selectedWorkload,
                          dataFetcher,
                          cloud,
                          region,
                          datacenterGuid,
                          tgtWorkloadGuid
                        )
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
