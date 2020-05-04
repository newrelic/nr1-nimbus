import React from 'react';
import Select from 'react-select';
import { Label, Icon } from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';

export default class TagSelector extends React.PureComponent {
  render() {
    return (
      <DataConsumer>
        {({ tags, updateTags, deleteTag, selectedTags }) => {
          const tagOptions = tags
            .filter(tag => !tag.includes('Guid')) // do not have guids as an available filter
            .map(tag => ({
              key: tag,
              label: tag.replace('m.', ''),
              value: tag
            }));

          return (
            <>
              <div className="react-select-input-group">
                <label>Tag Filter</label>
                <Select
                  options={tagOptions}
                  onChange={tag => updateTags(tag)}
                  // onChange={data => updateDataContextState({ bucketMs: data })}
                  // value={bucketMs}
                  value={null}
                  classNamePrefix="react-select"
                />
              </div>

              {selectedTags.map(tag => {
                return (
                  <Label
                    key={tag.key}
                    color="teal"
                    style={{ cursor: 'pointer' }}
                    pointing="left"
                    onClick={() => deleteTag(tag)}
                  >
                    {tag.label}
                    <Icon name="delete" />
                  </Label>
                );
              })}
            </>
          );
        }}
      </DataConsumer>
    );
  }
}
