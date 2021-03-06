import React from 'react';
import PropTypes from 'prop-types';
import { Select, Form } from 'antd';
import { $AND, $OR } from '../condition-constants';
import styles from './condition-relation-select.styl';

const Option = Select.Option;

class ConditionRelationSelect extends React.Component {

  static propTypes = {
    value: PropTypes.string,
    uuid: PropTypes.string,
    onChange: PropTypes.func,
    form: PropTypes.object
  };

  onChangeProxy(value) {
    const { uuid, onChange } = this.props;
    onChange({ value, uuid });
  }

  render() {
    const { value, form } = this.props;

    const selectStyle = {
      width: '60px'
    };

    return (
      <div className={styles.container} >
        {form.getFieldDecorator('condition', {
          initialValue: value
        })(
          <Select style={selectStyle} onChange={::this.onChangeProxy} >
            <Option value={$AND} >AND</Option>
            <Option value={$OR} >OR</Option>
          </Select>
        )}
      </div>
    );
  }
}

export default Form.create()(ConditionRelationSelect);
