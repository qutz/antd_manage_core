import React from 'react';
import antd from 'antd';
import { generatePagination, generateQuery } from '../../utils/ant-table';
import ConditionSearch from '../condition-editor/condition-search';
import TableColumnManage from '../table-column-manage/table-column-manage';
import TableToExcel from '../table-to-excel/table-to-excel';
import _ from 'lodash';
import styles from './table.styl';
import AlertError from '../alert-error/alert-error';
const AntdTable = antd.Table;
const Card = antd.Card;
const Icon = antd.Icon;
const message = antd.message;

class Table extends React.Component {

  static propTypes = {
    httpService: React.PropTypes.object,
    tableColumnManageConfigs: React.PropTypes.object,
    conditionSearchConfigs: React.PropTypes.object,
    tableProps: React.PropTypes.object,
    conditionSearch: React.PropTypes.bool,
    tableColumnManage: React.PropTypes.bool,
    formatConditionQuery: React.PropTypes.func,
    fetchDataMethodName: React.PropTypes.string,
    deleteMethodName: React.PropTypes.string,
    pageSize: React.PropTypes.number,
    onDataChange: React.PropTypes.func,
    handleFetchOptions: React.PropTypes.func,
    pageSizeChanger: React.PropTypes.bool,
    formatSorter: React.PropTypes.func,
    exportExcel: React.PropTypes.bool,
    exportExcelLimit: React.PropTypes.number,
  };
  state = {
    data: [],
    pagination: {},
    query: {},
    queryString: '',
    filterColumns: [],
    visible: false,
    dataLoading: false,
    dataLoadError: false,
    dataLoadErrorMessage: '数据加载失败,点击重新更新...'
  };

  componentDidMount() {
    this.state.query = generateQuery({ pagination: { pageSize: this.props.pageSize } });
    this.fetchData();
  }

  onColumnsChange(e) {
    this.setState({
      filterColumns: e.value
    });
  }

  onSearch(e) {
    const { query } = this.state;
    query.offset = 0;
    let conditionQuery = e.value.conditionQuery;
    if (this.props.formatConditionQuery) {
      conditionQuery = this.props.formatConditionQuery(e.value.conditionResult);
    }
    this.setState({
      queryString: conditionQuery,
      query
    }, () => {
      this.fetchData();
    });
  }

  onDelete(e) {
    const { httpService, deleteMethodName } = this.props;
    httpService[deleteMethodName](e.value)
      .then(() => {
        message.success('删除成功');
        this.fetchData();
      })
      .catch(() => message.success('删除失败'));
  }

  fetchData(showDataLoading) {
    const { httpService, fetchDataMethodName, onDataChange, handleFetchOptions } = this.props;

    this.setState({
      dataLoading: showDataLoading === undefined ? true : showDataLoading,
      dataLoadError: false
    });
    httpService[fetchDataMethodName](handleFetchOptions({
      query: this.state.query,
      queryString: this.state.queryString
    })).then((response) => {
      this.setState({
        dataLoading: false,
        data: response.results,
        pagination: generatePagination(response.pagination, this.props.pageSizeChanger)
      }, () => {
        onDataChange({
          value: response.results
        });
      });
    }).catch((e) => {
      const stateObj = {
        dataLoading: false,
        dataLoadError: true
      };
      if (e.message.indexOf('request timeout') !== -1) {
        stateObj.dataLoadErrorMessage = '数据加载超时,点击重新更新...';
      }
      this.setState(stateObj);
    });
  }

  handleTableChange(pagination, filters, sorter) {
    const { formatSorter } = this.props;
    let sorterQuery = sorter;
    if (_.isFunction(formatSorter)) {
      sorterQuery = formatSorter(sorter);
    }
    this.setState({
      query: generateQuery({ pagination, filters, sorter: sorterQuery })
    }, () => {
      this.fetchData();
    });
  }

  render() {
    const {
      data,
      pagination,
      filterColumns,
      dataLoading,
      dataLoadError,
      queryString
    } = this.state;
    const {
      tableColumnManageConfigs,
      conditionSearchConfigs,
      tableColumnManage,
      conditionSearch,
      tableProps,
      httpService,
      exportExcel,
      exportExcelLimit
    } = this.props;

    let tableToExcelComponent = null;

    if (exportExcel && pagination.total <= exportExcelLimit && pagination.total > 0) {
      tableToExcelComponent = (
        <TableToExcel
          columns={filterColumns}
          httpService={httpService}
          dataCount={pagination.total}
          queryString={queryString}
        />
      );
    }

    let tableColumnManageComponent = (
      <div>
        <TableColumnManage
          {...tableColumnManageConfigs}
          onColumnsChange={::this.onColumnsChange}
        />
        {tableToExcelComponent}
        <a className={styles.reload} onClick={::this.fetchData} >
          <Icon type="reload" />
        </a>
      </div>
    );

    let cardTitle;
    if (tableColumnManage) {
      cardTitle = tableColumnManageConfigs.title ?
        tableColumnManageConfigs.title : ' ';
    }

    let conditionSearchComponent;
    if (conditionSearch) {
      conditionSearchComponent = (
        <ConditionSearch
          {...conditionSearchConfigs}
          onSearch={::this.onSearch}
        />
      );
    }
    return (
      <div className={styles.container} >
        {conditionSearchComponent}
        <AlertError
          message={this.state.dataLoadErrorMessage}
          onClick={() => this.fetchData()}
          visible={dataLoadError}
        />
        <Card title={cardTitle} extra={tableColumnManageComponent} className={styles.card} >
          <AntdTable
            loading={dataLoading}
            columns={filterColumns}
            dataSource={data}
            pagination={pagination}
            rowKey={record => record[filterColumns[0].dataIndex]}
            onChange={::this.handleTableChange}
            {...tableProps}
          />
        </Card>
      </div>
    );
  }
}

Table.defaultProps = {
  fetchDataMethodName: 'getAll',
  deleteMethodName: 'delete',
  exportExcel: false,
  onDataChange: _.noop,
  exportExcelLimit:30000,
  handleFetchOptions: (v) => v
};

export default Table;
