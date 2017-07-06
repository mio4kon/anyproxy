/**
 * Created by mio4kon on 17/6/30.
 */
import React, {PropTypes}  from 'react';
import {connect} from 'react-redux';
import {Table, Icon} from 'antd';
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
    }


    getTableContent() {
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
        const data = [
            {
                key: 1,
                name: 'John Brown',
                age: 32,
                address: 'New York No. 1 Lake Park',
                description: 'My name is John Brown, I am 32 years old, living in New York No. 1 Lake Park.'
            },
            {
                key: 2,
                name: 'Jim Green',
                age: 42,
                address: 'London No. 1 Lake Park',
                description: 'My name is Jim Green, I am 42 years old, living in London No. 1 Lake Park.'
            },
            {
                key: 3,
                name: 'Joe Black',
                age: 32,
                address: 'Sidney No. 1 Lake Park',
                description: 'My name is Joe Black, I am 32 years old, living in Sidney No. 1 Lake Park.'
            },
        ];

        const columns2 = [
            {title: 'Name', dataIndex: 'name', key: 'name'},
            {title: 'Age', dataIndex: 'age', key: 'age'},
            {title: 'Address', dataIndex: 'address', key: 'address'},
            {title: 'Action', dataIndex: '', key: 'x', render: () => <a href="#">Delete</a>},
        ];

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
                   expandedRowRender={record => <p>{record.mock_body}</p>}
                   size="middle"/>
        )
    }

    render() {
        // {this.props.globalStatus.loadSuccess ? this.getDataBaseContent() : this.getFormContent()  }
        return (
            <div>
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