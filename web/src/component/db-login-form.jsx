/**
 * Created by mio4kon on 17/6/30.
 */
import React, {PropTypes}  from 'react';
import {connect} from 'react-redux';
import {Form, Icon, Input, Button, Checkbox, Spin} from 'antd';
const FormItem = Form.Item;
import Style from './db-login-form.less';
import {
    connectDataBase
} from 'action/globalStatusAction';
class DbLoginForm extends React.Component {

    constructor() {
        super();
        this.connectDb = this.connectDb.bind(this);
        this.getFormContent = this.getFormContent.bind(this);
    }

    static propTypes = {
        dispatch: PropTypes.func,
        globalStatus: PropTypes.object
    }

    connectDb() {
        console.log(this.props)
        this.props.dispatch(connectDataBase());
    }

    handleSubmit = (e) => {
        e.preventDefault();
        this.props.form.validateFields((err, values) => {
            if (!err) {
                console.log('Received values of form: ', values);
                this.connectDb();
            }
        });
    }


    getFormContent() {
        const {getFieldDecorator} = this.props.form;
        const isLoading = this.props.globalStatus.loading;
        const loadSuccess = this.props.globalStatus.loadSuccess;
        console.log('status loading : ' + isLoading);
        console.log('status loadSuccess : ' + loadSuccess);
        return (
            <Spin size="large" spinning={isLoading}>
                <Form onSubmit={this.handleSubmit} className={Style.loginForm}>
                    <FormItem>
                        {getFieldDecorator('host', {
                            rules: [{required: true, message: 'Please input database host!'}],
                            initialValue: '127.0.0.1',
                        })(
                            <Input prefix={<Icon type="android-o" style={{fontSize: 13}}/>} placeholder="Host"/>
                        )}
                    </FormItem>
                    <FormItem>
                        {getFieldDecorator('port', {
                            rules: [{required: true, message: 'Please input database port!'}],
                            initialValue: '3306',
                        })(
                            <Input prefix={<Icon type="android-o" style={{fontSize: 13}}/>}
                                   placeholder="Port"/>
                        )}
                    </FormItem>
                    <FormItem>
                        {getFieldDecorator('username', {
                            rules: [{required: true, message: 'Please input database username!'}],
                            initialValue: 'root',
                        })(
                            <Input prefix={<Icon type="android-o" style={{fontSize: 13}}/>}
                                   placeholder="Username"/>
                        )}
                    </FormItem>
                    <FormItem>
                        {getFieldDecorator('password', {
                            rules: [{required: true, message: 'Please input database Password!'}],
                            initialValue: 'root',
                        })(
                            <Input prefix={<Icon type="lock" style={{fontSize: 13}}/>} type="password"
                                   placeholder="Password"/>
                        )}
                    </FormItem>
                    <FormItem>
                        {getFieldDecorator('database', {
                            rules: [{required: true, message: 'Please input which database!'}],
                            initialValue: 'test',
                        })(
                            <Input prefix={<Icon type="database" style={{fontSize: 13}}/>}
                                   placeholder="Database"/>
                        )}
                    </FormItem>
                    <FormItem>
                        {getFieldDecorator('remember', {
                            valuePropName: 'checked',
                            initialValue: true,
                        })(
                            <Checkbox>Remember me</Checkbox>
                        )}
                        <Button type="primary" htmlType="submit" className={Style.loginFormButton}>
                            Connect
                        </Button>
                    </FormItem>
                </Form>
            </Spin>
        );
    }


    render() {
        return (
            <div>
                { this.getFormContent()  }
            </div>
        )
    }
}

function select(state) {
    return {
        globalStatus: state.globalStatus
    };
}
const WrappedDbLoginForm = Form.create()(DbLoginForm);

export default connect(select)(WrappedDbLoginForm);