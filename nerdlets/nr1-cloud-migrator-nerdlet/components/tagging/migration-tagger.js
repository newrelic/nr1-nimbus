import React from 'react';
import { Modal, Button, Header, Form, Divider } from 'semantic-ui-react';
import { getTagValue } from '../../../shared/lib/utils';
import { replaceAllTagsQuery } from '../../../shared/lib/queries';
import { NerdGraphMutation } from 'nr1';
import { DataConsumer } from '../../context/data';

export default class MigrationTagger extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      tags: [],
      key: '',
      val: ''
    };
  }

  addTag = () => {
    let { tags, key, val } = this.state;
    for (let z = 0; z < tags.length; z++) {
      if (tags[z].key === key) {
        tags = tags.splice(z, 1);
        break;
      }
    }
    tags.push({ key, val });
    this.setState({ tags, key: '', val: '' });
  };

  updateTags = async (workloads, dataFetcher) => {
    const { tags } = this.state;
    workloads = workloads.filter(wl => getTagValue(wl.tags, 'tgtWorkloadGuid')); // filter source workloads

    const updatePromises = [];
    for (let z = 0; z < workloads.length; z++) {
      const tgtWorkloadGuid = getTagValue(workloads[z].tags, 'tgtWorkloadGuid');
      const datacenterGuid = getTagValue(workloads[z].tags, 'datacenterGuid');

      const newTagSet = [];

      if (datacenterGuid) {
        newTagSet.push({ key: 'datacenterGuid', val: datacenterGuid });
      }

      newTagSet.push({
        key: 'cloud',
        val: getTagValue(workloads[z].tags, 'cloud')
      });
      newTagSet.push({
        key: 'region',
        val: getTagValue(workloads[z].tags, 'region')
      });

      // retain existing migration id
      newTagSet.push({
        key: 'm.MigrationId',
        val: getTagValue(workloads[z].tags, 'm.MigrationId')
      });

      let projectName = '';
      for (let y = 0; y < tags.length; y++) {
        if (
          tags[y].key.includes('MigrationId') ||
          tags[y].key === 'region' ||
          tags[y].key === 'cloud'
        ) {
          continue;
        }
        // ensure prefix with m. so we know mandatory tags for tag compliance
        if (!tags[y].key.startsWith('m.')) {
          tags[y].key = `m.${tags[y].key}`;
        }
        // use new project name if available, otherwise keep old
        if (tags[y].key === 'm.ProjectName') {
          projectName = tags[y].val;
        }
      }

      if (!projectName) {
        newTagSet.push({
          key: 'm.ProjectName',
          val: getTagValue(workloads[z].tags, 'm.ProjectName')
        });
      }

      // combine tags
      const srcTagSet = [...newTagSet, ...tags];
      srcTagSet.push({ key: 'tgtWorkloadGuid', val: tgtWorkloadGuid });

      const tgtTagSet = [...newTagSet, ...tags];
      tgtTagSet.push({ key: 'srcWorkloadGuid', val: workloads[z].guid });

      updatePromises.push(
        NerdGraphMutation.mutate({
          mutation: replaceAllTagsQuery(workloads[z].guid, srcTagSet)
        })
      );
      updatePromises.push(
        NerdGraphMutation.mutate({
          mutation: replaceAllTagsQuery(tgtWorkloadGuid, tgtTagSet)
        })
      );
    }

    await Promise.all(updatePromises);

    // tags are not updated straight away, wait 5 seconds before fetching
    setTimeout(() => {
      dataFetcher(['workloadTags']);
    }, 5000);
    this.setState({ tags: [], open: false });
  };

  updateTag = (index, type, value) => {
    const { tags } = this.state;
    tags[index][type] = value;
    this.setState({ tags });
    this.forceUpdate();
  };

  render() {
    return (
      <DataConsumer>
        {({ dataFetcher }) => {
          const { title, workloads } = this.props;
          const { open, key, val, tags } = this.state;

          const wls = workloads.filter(wl =>
            getTagValue(wl.tags, 'm.MigrationId')
          );

          const multiWorkloadsMsg =
            'Tags will be replaced with the new set as defined below.';
          const singleWorkloadMsg =
            'Replace the tags for your migration workload.';

          let existingTags = [];
          if (wls.length === 1) {
            existingTags = wls[0].tags
              .filter(
                tag =>
                  !tag.key.includes('Guid') &&
                  !tag.key.toLowerCase().includes('account') &&
                  !tag.key.includes('MigrationId') &&
                  tag.key !== 'region' &&
                  tag.key !== 'cloud'
              )
              .map(tag => ({
                key: tag.key.replace('m.', ''),
                val: tag.values[0]
              }));
          }

          return (
            <Modal
              open={open}
              closeIcon
              onClose={() => this.setState({ open: false })}
              trigger={
                <Button
                  style={{ display: workloads.length > 0 ? '' : 'none' }}
                  circular
                  color="blue"
                  size="mini"
                  content={title}
                  icon="tag"
                  onClick={() => this.setState({ open: true })}
                />
              }
            >
              <Modal.Header>Edit Tags</Modal.Header>
              <Modal.Content>
                {workloads.length > 1 ? multiWorkloadsMsg : singleWorkloadMsg}
                <br /> <br />
                Workloads: {wls.map(wl => wl.name).toString()}
                <br />
                <br />
                <Form>
                  {tags.map((tag, i) => {
                    return (
                      <Form.Group widths="equal" key={i}>
                        <Form.Input
                          fluid
                          placeholder="Key"
                          value={tag.key}
                          onChange={e =>
                            this.updateTag(i, 'key', e.target.value)
                          }
                        />
                        <Form.Input
                          fluid
                          placeholder="Value"
                          value={tag.val}
                          onChange={e =>
                            this.updateTag(i, 'val', e.target.value)
                          }
                        />
                        <Form.Button
                          width="1"
                          icon="minus"
                          color="red"
                          inverted
                          circular
                          onClick={() =>
                            this.setState({ tags: tags.splice(i, 1) })
                          }
                        />
                      </Form.Group>
                    );
                  })}

                  <Form.Group widths="equal">
                    <Form.Input
                      fluid
                      placeholder="Key"
                      value={key}
                      onChange={e => this.setState({ key: e.target.value })}
                    />
                    <Form.Input
                      fluid
                      placeholder="Value"
                      value={val}
                      onChange={e => this.setState({ val: e.target.value })}
                    />
                    <Form.Button
                      disabled={key === '' || val === ''}
                      width="1"
                      icon="plus"
                      color="green"
                      inverted
                      circular
                      onClick={() => this.addTag()}
                    />
                  </Form.Group>

                  <div style={{ display: tags.length > 0 ? '' : 'none' }}>
                    <Button
                      style={{
                        float: 'right'
                      }}
                      content="Update Tags"
                      icon="tag"
                      positive
                      onClick={() => this.updateTags(wls, dataFetcher)}
                    />
                    <br /> <br />
                  </div>
                </Form>
                <Divider />
                <div
                  style={{
                    display:
                      wls.length === 1 && existingTags.length > 0 ? '' : 'none'
                  }}
                >
                  <Header as="h4" content="Existing Tags" />

                  <Form>
                    {existingTags.map((tag, i) => {
                      return (
                        <Form.Group widths="equal" key={i}>
                          <Form.Input fluid placeholder="Key" value={tag.key} />
                          <Form.Input
                            fluid
                            placeholder="Value"
                            value={tag.val}
                          />
                        </Form.Group>
                      );
                    })}
                  </Form>
                  <Button
                    style={{
                      float: 'right'
                    }}
                    content="Copy Tags"
                    icon="tag"
                    positive
                    onClick={() =>
                      this.setState({ tags: [...tags, ...existingTags] })
                    }
                  />
                  <br />
                  <br />
                </div>
              </Modal.Content>
            </Modal>
          );
        }}
      </DataConsumer>
    );
  }
}
