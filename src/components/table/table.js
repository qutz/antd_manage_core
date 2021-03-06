import React from 'react';
import PropTypes from 'prop-types';
import antd from 'antd';
import qs from 'qs';
import { generatePagination, generateQuery } from '../../utils/ant-table';
import ConditionSearch from '../condition-editor/condition-search';
import TableColumnManage from '../table-column-manage/table-column-manage';
import TableToExcel from '../table-to-excel/table-to-excel';
import _ from 'lodash';
import styles from './table.styl';
import AlertError from '../alert-error/alert-error';
import OfflineStorge from '../../services/offline-storge';
import DI from '../../di';
const AntdTable = antd.Table;
const Card = antd.Card;
const Icon = antd.Icon;
const message = antd.message;

class Table extends React.Component {

  static propTypes = {
    httpService: PropTypes.object,
    tableColumnManageConfigs: PropTypes.object,
    conditionSearchConfigs: PropTypes.object,
    tableProps: PropTypes.object,
    conditionSearch: PropTypes.bool,
    tableColumnManage: PropTypes.bool,
    formatConditionQuery: PropTypes.func,
    fetchDataMethodName: PropTypes.string,
    deleteMethodName: PropTypes.string,
    qsFormatSearchQuery: PropTypes.bool,
    pageSize: PropTypes.number,
    onDataChange: PropTypes.func,
    handleFetchOptions: PropTypes.func,
    pageSizeChanger: PropTypes.bool,
    formatSorter: PropTypes.func,
    exportExcel: PropTypes.bool,
    exportExcelLimit: PropTypes.number,
    exportExcelMethodName: PropTypes.string,
    handleExportExcelOptions: PropTypes.func
  };
  state = {
    data: [],
    pagination: {},
    query: generateQuery({ pagination: { pageSize: this.props.pageSize } }),
    queryString: '',
    filterColumns: [],
    visible: false,
    dataLoading: false,
    dataLoadError: false,
    dataLoadErrorMessage: '数据加载失败,点击重新更新...'
  };

  componentWillMount() {
    this.init().then(() => {
      if (!this.props.conditionSearch) {
        this.fetchData();
      }
    });
  }

  onColumnsChange(e) {
    this.setState({
      filterColumns: e.value
    });
  }

  onSearch(e) {
    this.init().then(() => {
      const { query } = this.state;
      query.offset = 0;

      const conditionQuery =
        this.generateConditionQueryString(e.value.conditionQuery, e.value.conditionResult);
      const userConditionQuery = this.generateConditionQueryString(
        e.value.userConditionQuery,
        e.value.userConditionResult,
        'userConditions'
      );
      const queryString = this.generateQueryString(conditionQuery, userConditionQuery);
      this.setState({
        queryString,
        query
      }, () => {
        this.fetchData();
      });
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

  init() {
    const { tableColumnManageConfigs } = this.props;
    const { name } = tableColumnManageConfigs;
    return new Promise((resolve) => {
      this.offlineStorge = new OfflineStorge(
        DI.get('config').get('core.table.configStorageName'));
      this.offlineStorge.get(name).then((offlineConfigs) => {
        this.offlineConfigs = offlineConfigs;
        if (this.offlineConfigs && this.offlineConfigs.pageSize) {
          this.setState({
            query: generateQuery({ pagination: { pageSize: this.offlineConfigs.pageSize } })
          }, resolve);
        } else {
          resolve();
        }
      });
    });
  }

  generateQueryString(conditionQuery, userConditionQuery) {
    if (userConditionQuery && conditionQuery) {
      return `${conditionQuery}&${userConditionQuery}`;
    } else if (conditionQuery) {
      return conditionQuery;
    }
    return userConditionQuery;
  }

  generateConditionQueryString(query, result, queryKey) {
    let key = queryKey;
    if (!queryKey) {
      key = 'conditions';
    }

    const { qsFormatSearchQuery, formatConditionQuery } = this.props;
    let conditionQuery = query || '';
    if (formatConditionQuery && qsFormatSearchQuery) {
      conditionQuery = formatConditionQuery(result, key);
      conditionQuery = `${conditionQuery}&${this.qsFormatSearchQuery(result, key)}`;
    } else if (qsFormatSearchQuery) {
      conditionQuery = this.qsFormatSearchQuery(result, key);
    } else if (formatConditionQuery) {
      conditionQuery = formatConditionQuery(result, key, query);
    }
    return conditionQuery;
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
    const { tableColumnManageConfigs } = this.props;
    const { name } = tableColumnManageConfigs;
    this.offlineStorge.add(name, { pageSize: pagination.pageSize });
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

  qsFormatSearchQuery(queryObj, queryKey) {
    return `${queryKey}=${encodeURIComponent(qs.stringify({ conditions: queryObj }))}`;
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
      httpService,
      exportExcel,
      exportExcelLimit
    } = this.props;

    let { tableProps } = this.props;

    let tableToExcelComponent = null;

    if (exportExcel) {
      tableToExcelComponent = (
        <TableToExcel
          columns={filterColumns}
          httpService={httpService}
          dataCount={pagination.total}
          queryString={queryString}
          limit={exportExcelLimit}
          total={pagination.total}
          handleExportExcelOptions={this.props.handleExportExcelOptions}
          exportExcelMethodName={this.props.exportExcelMethodName}
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
        <a className={styles.reload} onClick={() => this.fetchData()}>
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

    if (data.length === 0) {
      tableProps = _.omit(tableProps, 'expandedRowRender');
    }

    return (
      <div className={styles.container}>
        {conditionSearchComponent}
        <AlertError
          message={this.state.dataLoadErrorMessage}
          onClick={() => this.fetchData()}
          visible={dataLoadError}
        />
        <Card title={cardTitle} extra={tableColumnManageComponent} className={styles.card}>
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
  exportExcelLimit: 30000,
  handleFetchOptions: (v) => v,
  handleExportExcelOptions: (v) => v,
  exportExcelMethodName: 'addTableToExcelTask',
  pageSizeChanger: true
};

export default Table;
