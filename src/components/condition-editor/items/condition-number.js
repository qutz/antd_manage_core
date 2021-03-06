import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { Input, Form, Button, Icon, Select } from 'antd';
import ConditionPredicateSelect from './condition-predicate-select';
import { getPredicates } from '../conditions-utils';
import { $IN, $LIKE, $NOT_IN, $IS_NOT_NULL, $IS_NULL } from '../condition-constants';

const FormItem = Form.Item;
const Option = Select.Option;

class ConditionNumber extends React.Component {

  static propTypes = {
    text: PropTypes.string,
    value: PropTypes.any,
    form: PropTypes.object,
    predicate: PropTypes.string,
    subConfig: PropTypes.object,
    uuid: PropTypes.string,
    onChange: PropTypes.func,
    onDelete: PropTypes.func,
    predicateOnChange: PropTypes.func,
    excludePredicates: PropTypes.array
  };

  static defaultExcludePredicates = [$LIKE, $IS_NOT_NULL, $IS_NULL];

  componentWillMount() {
    const { excludePredicates } = this.props;
    this.predicates = getPredicates(
      _.union(
        ConditionNumber.defaultExcludePredicates,
        excludePredicates)
    );
  }

  onChangeProxy() {
    const { uuid, form, onChange } = this.props;
    onChange({ value: form.getFieldValue(uuid), uuid });
  }

  onTextareaChangeProxy() {
    const { uuid, form, onChange } = this.props;
    const fieldValue = form.getFieldValue(uuid);
    let values = fieldValue;
    if (fieldValue && typeof fieldValue === 'string') {
      let fieldValues = fieldValue.replace(/\r\n/g, ',').replace(/\n/g, ',');
      fieldValues = fieldValues.replace(/\s/g, ',').split(',');
      values = _.remove(fieldValues, n => (n));
    }
    onChange({ value: values, uuid });
  }

  onDeleteProxy() {
    const { uuid, onDelete } = this.props;
    onDelete({ uuid });
  }

  onSelectChange(value) {
    const { uuid, onChange } = this.props;
    onChange({ value, uuid });
  }

  render() {
    const { text, value, form, predicate, predicateOnChange, uuid, subConfig } = this.props;
    const tagsMode = true;
    const selectStyle = {
      width: '100%',
      minWidth: '140px'
    };
    const firstOptionContent = '以下是您已输入的...';
    const firstOptionDisabled = true;

    let inputForm;
    if (predicate === $IN || predicate === $NOT_IN) {
      const showTextarea = subConfig &&
          (subConfig.typeFor$IN === 'textarea' || subConfig.typeFor$NOT_IN === 'textarea');
      if (showTextarea) {
        inputForm = form.getFieldDecorator(uuid, {
          initialValue: value
        })(
          <Input.TextArea onBlur={::this.onTextareaChangeProxy} rows={1} />
        );
      } else {
        inputForm = form.getFieldDecorator(uuid, {
          initialValue: value
        })(
          <Select
            style={selectStyle}
            tags={tagsMode}
            onChange={::this.onSelectChange}
          >
            <Option
              disabled={firstOptionDisabled}
              value={firstOptionContent}
            >
              {firstOptionContent}
            </Option >
          </Select>
        );
      }
    } else {
      inputForm = form.getFieldDecorator(uuid, {
        initialValue: value
      })(
        <Input onBlur={::this.onChangeProxy} />
      );
    }

    return (
      <Form layout={'inline'} >
        <FormItem label={text} >
          <ConditionPredicateSelect
            uuid={uuid}
            predicate={predicate}
            predicates={this.predicates}
            predicateOnChange={predicateOnChange}
          />
        </FormItem>
        <FormItem>
          {inputForm}
        </FormItem>
        <Button onClick={::this.onDeleteProxy} shape="circle" ><Icon type="delete" /></Button>
      </Form>
    );
  }
}

export default Form.create()(ConditionNumber);
