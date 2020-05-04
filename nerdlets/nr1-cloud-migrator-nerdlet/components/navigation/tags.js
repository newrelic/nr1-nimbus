import React from 'react';
import { Form } from 'semantic-ui-react';
import { DataConsumer } from '../../context/data';

export default class Tags extends React.PureComponent {
  checkTag = (tagSelection, group, item, updateDataContextState) => {
    const newTagSelection = { ...tagSelection };
    newTagSelection[group][item] = !tagSelection[group][item];
    updateDataContextState({ tagSelection: newTagSelection });
  };

  render() {
    return (
      <DataConsumer>
        {({ tagSelection, updateDataContextState }) => {
          return (
            <Form
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                overflowX: 'hidden',
                paddingLeft: '10px'
              }}
            >
              {Object.keys(tagSelection).map(group => {
                return (
                  <Form.Group grouped key={group}>
                    <span
                      style={{ textTransform: 'uppercase', fontSize: '10px' }}
                    >
                      {group.replace('m.', '')}
                    </span>
                    {Object.keys(tagSelection[group]).map((item, i) => {
                      return (
                        <Form.Checkbox
                          style={{ fontSize: '10px' }}
                          key={i}
                          label={item}
                          value={item}
                          checked={tagSelection[group][item]}
                          onChange={() =>
                            this.checkTag(
                              tagSelection,
                              group,
                              item,
                              updateDataContextState
                            )
                          }
                        />
                      );
                    })}
                  </Form.Group>
                );
              })}
            </Form>
          );
        }}
      </DataConsumer>
    );
  }
}
