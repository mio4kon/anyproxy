/**
 * The panel to edit the filter
 *
 */

import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import ResizablePanelLarge from 'component/resizable-panel-large';
import {hideFilter, updateFilter} from 'action/globalStatusAction';
import {MenuKeyMap} from 'common/Constant';
import DbLoginForm from 'component/db-login-form';
import DbDataTable from 'component/db-data-table';
import Style from './record-filter.less';
import MockStyle from './db-login-form.less';
import CommonStyle from '../style/common.less';


class Mock extends React.Component {
    constructor() {
        super();
        this.onChange = this.onChange.bind(this);
        this.onClose = this.onClose.bind(this);
        this.filterTimeoutId = null;
    }

    static propTypes = {
        dispatch: PropTypes.func,
        globalStatus: PropTypes.object
    }

    onChange(event) {
        this.props.dispatch(updateFilter(event.target.value));
    }

    onClose() {
        this.props.dispatch(hideFilter());
    }

    render() {

        const panelVisible = this.props.globalStatus.activeMenuKey === MenuKeyMap.MOCK;
        return (
            <ResizablePanelLarge onClose={this.onClose} visible={panelVisible}>
                <div className={Style.filterWrapper}>
                    <div className={Style.title}>
                        Mock
                    </div>
                    <div className={CommonStyle.whiteSpace40}/>
                    <div className={MockStyle.mockDiv}>
                        {
                            this.props.globalStatus.loadSuccess ?
                                <DbDataTable className={MockStyle.loginForm}/> :
                                <DbLoginForm className={MockStyle.loginForm}/>
                        }

                    </div>
                </div>


            </ResizablePanelLarge>
        );
    }
}

function select(state) {
    return {
        globalStatus: state.globalStatus
    };
}

export default connect(select)(Mock);
