import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { Link } from 'react-router-dom';
import { Menu, Icon } from 'antd';
import styles from './navigation.styl';
import DI from '../../di';
import HashHistory from '../../router/hash-history';

class Navigation extends React.Component {

  static propTypes = {
    onToggle: PropTypes.func,
    toggle: PropTypes.bool
  };

  state = {
    current: [],
    configs: [],
    openKeys: [],
    iconToggle: ''
  };

  componentWillMount() {
    this.getNavigation();

    DI.get('auth').listenPermissionChange(() => {
      this.getNavigation();
    });
    this.locationHasChanged();
    this.unsubscribed = HashHistory.listen(::this.locationHasChanged);
  }

  componentWillReceiveProps(nextProps) {
    const { toggle } = nextProps;
    this.toggleIconType(!toggle);
  }

  componentWillUnmount() {
    this.unsubscribed();
  }

  onOpen = (e) => {
    this.setState({
      openKeys: e.openKeys
    });
  };

  onClose = (e) => {
    this.onOpen(e);
  };

  onOpenChange = (openKeys) => {
    this.setState({
      openKeys
    });
  };

  getNavigation() {
    DI.get('navigation')
      .getConfigs()
      .then((configs) => this.setState({ configs }));
  }

  locationHasChanged(toRoute) {
    const path = toRoute ? toRoute.pathname : HashHistory.location.pathname;
    if (path === '/') {
      DI.get('navigation')
        .getDefault()
        .then((config) => {
          this.setState({
            current: [config.path]
          });
        });
    } else {
      DI.get('navigation')
        .getPaths(path)
        .then((paths) => {
          DI.get('navigation')
            .calcCurrentPath(paths, path)
            .then((currentPath) => {
              this.setState({
                current: [currentPath],
                openKeys: paths
              });
            });
        });
    }
  }

  /**
   * SubMenu的Parent Element必须是Menu,否者报错,这里不能自定义递归Component
   *
   * @param config
   * @returns {XML}
   */
  parseConfig(config) {
    let name = config.name;
    const hasNoPermission = config.hasNoPermission;
    const childConfigs = config.child;
    const path = config.path;
    if (childConfigs && !DI.get('navigation').needIgnoreChild(config)) {
      const childNavigation = [];

      _.each(childConfigs, (childConfig) => {
        childNavigation.push(this.parseConfig(childConfig));
      });

      return <Menu.SubMenu key={path} title={name} >{childNavigation}</Menu.SubMenu>;
    }

    if (hasNoPermission) {
      name = (
        <span>{name}</span>
      );
    }

    if (config.hide) {
      return null;
    }

    return (
      <Menu.Item key={path} >
        <Link to={path} >{name}</Link>
      </Menu.Item>
    );
  }

  toggleIconType(toggle) {
    this.setState({
      iconToggle: !toggle
    });
  }

  toggleNavigation() {
    const { onToggle, toggle } = this.props;
    this.toggleIconType(toggle);
    if (onToggle) {
      onToggle(!toggle);
    }
  }

  parseConfigs(configs) {
    return _.map(configs, (config) => this.parseConfig(config));
  }

  render() {
    const { configs, current, openKeys, iconToggle } = this.state;
    const { toggle } = this.props;
    const navigation = this.parseConfigs(configs);
    return (
      <aside className={toggle ? `${styles.container} ${styles.toggle}` : styles.container} >
        <div className={styles.toggleDiv} onClick={::this.toggleNavigation}>
          <Icon
            type={iconToggle ? 'caret-right' : 'caret-left'}
            className={iconToggle ? `${styles.toggleIcon} ${styles.toggled}` : styles.toggleIcon}
          />
        </div>
        <Menu
          onClick={this.handleClick}
          openKeys={openKeys}
          onOpenChange={this.onOpenChange}
          selectedKeys={current}
          mode="inline"
        >
          {navigation}
        </Menu>
      </aside>
    );
  }
}

Navigation.contextTypes = {
  ...React.Component.contextTypes,
  router: PropTypes.object
};

export default Navigation;
