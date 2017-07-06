/**
 * Created by mio4kon on 17/6/30.
 */
import React, {PropTypes}  from 'react';
import {connect} from 'react-redux';
import {Table, Button} from 'antd';
import Style from './db-login-form.less';
import {
    connectDataBase
} from 'action/globalStatusAction';
class DbDataTable extends React.Component {

    constructor() {
        super();
        this.getTableContent = this.getTableContent.bind(this);
    }

    static propTypes = {
        dispatch: PropTypes.func,
        globalStatus: PropTypes.object
    };

    start = () => {
        console.log('click');
    };

    state = {
        selectedRowKeys: [],
    };

    onSelectChange = (selectedRowKeys) => {
        console.log('selectedRowKeys changed: ', selectedRowKeys);
        this.setState({ selectedRowKeys });
    };

    getTableContent() {
        const {selectedRowKeys } = this.state;
        const rowSelection = {
            selectedRowKeys,
            onChange: this.onSelectChange,
        };
        const mockData = this.props.globalStatus.mockData;
        const tabData = [];
        mockData.forEach((item, index, array) => {
            let temp = {
                key: index,
                mock_type: item.mock_type,
                mock_url: item.mock_url,
                mock_desc: item.mock_desc,
                mock_body: item.mock_body,
            };
            tabData.push(temp);
        });
        const columns = [{
            title: 'MockUrl',
            dataIndex: 'mock_url',
            key: 'mock_url'
        }, {
            title: 'MockType',
            dataIndex: 'mock_type',
            key: 'mock_type'

        }, {
            title: 'MockDesc',
            dataIndex: 'mock_desc',
            key: 'mock_desc'
        }];
        return (
            <Table columns={columns}
                   dataSource={tabData}
                   rowSelection={rowSelection}
                   expandedRowRender={record => <p>{record.mock_body}</p>}
                   size="middle"/>
        )
    }

    render() {
        return (
            <div>
                <div style={{marginBottom: 16}}>
                    <Button
                        type="primary"
                        onClick={this.start}
                        disabled={false}
                    >
                        Clear
                    </Button>

                </div>
                {this.getTableContent()}
            </div>
        )
    }

}

function select(state) {
    return {
        globalStatus: state.globalStatus
    };
}

export default connect(select)(DbDataTable);