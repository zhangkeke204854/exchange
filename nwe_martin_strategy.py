import os
import time
import json
import copy
import talib
import random
import pandas as pd
from datetime import datetime, timedelta


# 策略参数
g_params['account'] = 'Q1304843512'  # 交易账户
g_params['barType'] = 'M'  # K线类型（M分钟，D日线）
g_params['barInterval'] = 5  # K线周期
g_params['k_number'] = 50  # K线数量
g_params['more_position'] = 0  # 合约多仓（0否，1是）
g_params['target'] = 600  # 目标金额
g_params['quantity'] = 1  # 订单最小手数
g_params['order_group'] = 5  # 订单组数
g_params['max_loss'] = 8  # 最大止损次数
g_params['profit_number'] = 1  # 止盈滑点倍数
g_params['loss_number'] = 0  # 止损滑点倍数
g_params['delay_number'] = 15  # 行情触发延后次数
g_params['minutes'] = 3  # 进场延时撤单分钟数
g_params['seconds'] = 30  # 止盈止损延时撤单秒数
g_params['open_order_type'] = 2  # 开仓类型（1市价，2限价）
g_params['close_order_type'] = 2  # 平仓类型（1市价，2限价）
g_params['s_buy'] = 1  # s信号多单（0否，1是）
g_params['s_sell'] = 0  # s信号空单（0否，1是）
g_params['b_buy'] = 0  # b信号多单（0否，1是）
g_params['b_sell'] = 1  # b信号空单（0否，1是）
g_params['file_path'] = 'C:\期货'  # 文件路径
g_params['file_name'] = '合约信息表.xlsx'  # 文件名称
g_params['sheet_name'] = '合约信息'  # sheet表名称


new_order_dict = {}
order_dict = {}
save_order_dict = {}
order_group_dict = {}
save_order_group_dict = {}
target_dict = {}
symbol_dict = {}
delay_number_dict = {}
create_signal_dict = {}
random_symbol = None
order_file = None
group_file = None
log_file = None
_format = '%Y-%m-%d %H:%M:%S'


# 保存日志
def save_log(msg):
    LogInfo(msg)
    with open(log_file, 'a', encoding='utf-8') as w:
        w.write(str(msg) + '\n')


# 读取order文件
def read_order_file():
    global order_dict, save_order_dict

    if os.path.exists(order_file):
        with open(order_file, "r", encoding="utf-8") as f:
            save_order_dict = json.load(f)
    
    # 将字典转换为JSON字符串后比较
    if json.dumps(save_order_dict, sort_keys=True) != json.dumps(order_dict, sort_keys=True):
        for key_symbol, value_dict in save_order_dict.items():
            if key_symbol in order_dict:
                order_dict[key_symbol] = copy.deepcopy(value_dict)


# 写入order文件
def write_order_file():
    global order_dict, save_order_dict

    # 将字典转换为JSON字符串后比较
    if json.dumps(save_order_dict, sort_keys=True) != json.dumps(order_dict, sort_keys=True):
        save_order_dict = copy.deepcopy(order_dict)
        with open(order_file, "w", encoding="utf-8") as w:
            json.dump(save_order_dict, w, indent=2, ensure_ascii=False, sort_keys=True)


# 读取group文件
def read_group_file():
    global order_group_dict, save_order_group_dict

    if os.path.exists(group_file):
        with open(group_file, "r", encoding="utf-8") as f:
            save_order_group_dict = json.load(f)

    # 将字典转换为JSON字符串后比较
    if json.dumps(save_order_group_dict, sort_keys=True) != json.dumps(order_group_dict, sort_keys=True):
        for key_group, value_dict in save_order_group_dict.items():
            if key_group in order_group_dict:
                order_group_dict[key_group] = copy.deepcopy(value_dict)


# 写入group文件
def write_group_file():
    global order_group_dict, save_order_group_dict
    
    # 将字典转换为JSON字符串后比较
    if json.dumps(save_order_group_dict, sort_keys=True) != json.dumps(order_group_dict, sort_keys=True):
        save_order_group_dict = copy.deepcopy(order_group_dict)
        with open(group_file, "w", encoding="utf-8") as w:
            json.dump(save_order_group_dict, w, indent=2, ensure_ascii=False, sort_keys=True)


# 创建信号
def create_signal(k_date_time, symbol, exchange_no, symbol_name, buy_position, sell_position):
    global order_dict, new_order_dict, order_group_dict

    open_array = Open(symbol, g_params['barType'], g_params['barInterval'])
    high_array = High(symbol, g_params['barType'], g_params['barInterval'])
    low_array = Low(symbol, g_params['barType'], g_params['barInterval'])
    close_array = Close(symbol, g_params['barType'], g_params['barInterval'])

    create_signal_flag = False
    if g_params['more_position'] == 0:
        if buy_position <= 0 and sell_position <= 0:
            create_signal_flag = True
    else:
        create_signal_flag = True

    if create_signal_flag:
        delay_number_dict[symbol] = 0

        read_group_file()  # 读取group文件
        sorted_order_group_dict = dict(sorted(order_group_dict.items(), key=lambda x: x[1]['当前止损次数'], reverse=True))

        group = None
        for key_group, value_dict in sorted_order_group_dict.items():
            if value_dict['是否下单'] and not value_dict['当前合约']:
                group = key_group
                break
        if group:
            min_amplitude, max_amplitude = order_group_dict[group]['最小幅度'], order_group_dict[group]['最大幅度']
            if not min_amplitude or not max_amplitude:
                if order_group_dict[group]['当前止损次数'] <= 3:
                    min_amplitude, max_amplitude = 0.2, 0.6
                elif order_group_dict[group]['当前止损次数'] == 4:
                    min_amplitude, max_amplitude = 0.5, 2.0
                elif order_group_dict[group]['当前止损次数'] == 5:
                    min_amplitude, max_amplitude = 0.8, 2.0
                else:
                    min_amplitude, max_amplitude = 1.4, 2.5

            flag_list = []
            s_flag_date_time = order_dict[symbol]['s_flag_date_time']
            b_flag_date_time = order_dict[symbol]['b_flag_date_time']
            if s_flag_date_time and not b_flag_date_time:
                flag_list.append(['s', 's_flag_date_time', 's_flag_high', 's_flag_low'])
            elif not s_flag_date_time and b_flag_date_time:
                flag_list.append(['b', 'b_flag_date_time', 'b_flag_high', 'b_flag_low'])
            elif s_flag_date_time and b_flag_date_time:
                if s_flag_date_time >= b_flag_date_time:
                    flag_list.append(['s', 's_flag_date_time', 's_flag_high', 's_flag_low'])
                    flag_list.append(['b', 'b_flag_date_time', 'b_flag_high', 'b_flag_low'])
                else:
                    flag_list.append(['b', 'b_flag_date_time', 'b_flag_high', 'b_flag_low'])
                    flag_list.append(['s', 's_flag_date_time', 's_flag_high', 's_flag_low'])

            for each in flag_list:
                flag_high, flag_low = order_dict[symbol][each[2]], order_dict[symbol][each[3]]
                if each[0] == 's' and g_params['s_buy'] == 1:
                    if close_array[-1] > flag_high > low_array[-1]:
                        price = Q_Last(symbol)
                        count = abs(price - flag_low)  # 止盈止损点数
                        amplitude = round(count / price * 100, 2)  # 振幅
                        if min_amplitude < amplitude < max_amplitude:
                            new_order_dict.update({symbol: {'flag': each[0], 'flag_date_time': k_date_time, 'flag_high': flag_high, 'flag_low': flag_low, 
                                                            'order_type': '开多', 'price': price, 'count': count, 'quantity': None, 'close_quantity': None, 'group': group, 
                                                            'open_order_no': None, 'close_order_no': [], 'order_message': {}, 'update_price_position': False, 
                                                            'create_order_time': None, 'cancel_order_time': None, 'remove': False}})
                            msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 当前价格:{close_array[-1]} 突破标志性k线{each[0]}的最高价:{flag_high} 振幅:{amplitude} 组别:{group} 产生开多信号'
                            save_log(msg)
                            break
                        else:
                            msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 当前价格:{close_array[-1]} 突破标志性k线{each[0]}的最高价:{flag_high} 振幅:{amplitude} 组别:{group} 振幅不在下单区间'
                            save_log(msg)
                if each[0] == 's' and g_params['s_sell'] == 1:
                    if close_array[-1] < flag_low < high_array[-1]:
                        price = Q_Last(symbol)
                        count = abs(flag_high - price)  # 止盈止损点数
                        amplitude = round(count / price * 100, 2)  # 振幅
                        if min_amplitude < amplitude < max_amplitude:
                            new_order_dict.update({symbol: {'flag': each[0], 'flag_date_time': k_date_time, 'flag_high': flag_high, 'flag_low': flag_low, 
                                                            'order_type': '开空', 'price': price, 'count': count, 'quantity': None, 'close_quantity': None, 'group': group, 
                                                            'open_order_no': None, 'close_order_no': [], 'order_message': {}, 'update_price_position': False, 
                                                            'create_order_time': None, 'cancel_order_time': None, 'remove': False}})
                            msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 当前价格:{close_array[-1]} 跌破标志性k线{each[0]}的最低价:{flag_low} 振幅:{amplitude} 组别:{group} 产生开空信号'
                            save_log(msg)
                            break
                        else:
                            msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 当前价格:{close_array[-1]} 跌破标志性k线{each[0]}的最低价:{flag_low} 振幅:{amplitude} 组别:{group} 振幅不在下单区间'
                            save_log(msg)
                if each[0] == 'b' and g_params['b_buy'] == 1:
                    if close_array[-1] > flag_high > low_array[-1]:
                        price = Q_Last(symbol)
                        count = abs(price - flag_low)  # 止盈止损点数
                        amplitude = round(count / price * 100, 2)  # 振幅
                        if min_amplitude < amplitude < max_amplitude:
                            new_order_dict.update({symbol: {'flag': each[0], 'flag_date_time': k_date_time, 'flag_high': flag_high, 'flag_low': flag_low, 
                                                            'order_type': '开多', 'price': price, 'count': count, 'quantity': None, 'close_quantity': None, 'group': group, 
                                                            'open_order_no': None, 'close_order_no': [], 'order_message': {}, 'update_price_position': False, 
                                                            'create_order_time': None, 'cancel_order_time': None, 'remove': False}})
                            msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 当前价格:{close_array[-1]} 突破标志性k线{each[0]}的最高价:{flag_high} 振幅:{amplitude} 组别:{group} 产生开多信号'
                            save_log(msg)
                            break
                        else:
                            msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 当前价格:{close_array[-1]} 突破标志性k线{each[0]}的最高价:{flag_high} 振幅:{amplitude} 组别:{group} 振幅不在下单区间'
                            save_log(msg)
                if each[0] == 'b' and g_params['b_sell'] == 1:
                    if close_array[-1] < flag_low < high_array[-1]:
                        price = Q_Last(symbol)
                        count = abs(flag_high - price)  # 止盈止损点数
                        amplitude = round(count / price * 100, 2)  # 振幅
                        if min_amplitude < amplitude < max_amplitude:
                            new_order_dict.update({symbol: {'flag': each[0], 'flag_date_time': k_date_time, 'flag_high': flag_high, 'flag_low': flag_low, 
                                                            'order_type': '开空', 'price': price, 'count': count, 'quantity': None, 'close_quantity': None, 'group': group, 
                                                            'open_order_no': None, 'close_order_no': [], 'order_message': {}, 'update_price_position': False, 
                                                            'create_order_time': None, 'cancel_order_time': None, 'remove': False}})
                            msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 当前价格:{close_array[-1]} 跌破标志性k线{each[0]}的最低价:{flag_low} 振幅:{amplitude} 组别:{group} 产生开空信号'
                            save_log(msg)
                            break
                        else:
                            msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 当前价格:{close_array[-1]} 跌破标志性k线{each[0]}的最低价:{flag_low} 振幅:{amplitude} 组别:{group} 振幅不在下单区间'
                            save_log(msg)

    # 计算标志性k线
    max_high, min_low = max(high_array[:-1]), min(low_array[:-1])

    if close_array[-1] > max_high:
        order_dict[symbol].update({'s_flag_date_time': k_date_time, 
                                    's_flag_open': open_array[-1], 
                                    's_flag_high': high_array[-1], 
                                    's_flag_low': low_array[-1], 
                                    's_flag_close': close_array[-1]})
        msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 形成标志性k线s，开盘价:{open_array[-1]} 最高价:{high_array[-1]} 最低价:{low_array[-1]} 收盘价:{close_array[-1]}'
        save_log(msg)
    
    elif close_array[-1] < min_low:
        order_dict[symbol].update({'b_flag_date_time': k_date_time, 
                                    'b_flag_open': open_array[-1], 
                                    'b_flag_high': high_array[-1], 
                                    'b_flag_low': low_array[-1], 
                                    'b_flag_close': close_array[-1]})
        msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 形成标志性k线b，开盘价:{open_array[-1]} 最高价:{high_array[-1]} 最低价:{low_array[-1]} 收盘价:{close_array[-1]}'
        save_log(msg)


# 发送订单
def send_order(account, symbol, exchange_no, symbol_name, send_order_list, enum_order='2'):
    order_flag, session_id = False, ''
    k_date_time = send_order_list[0]
    order_type = send_order_list[1]
    quantity = send_order_list[2]
    price = send_order_list[3]
    
    if order_type == '开多':
        orderDirct, entryOrExit = Enum_Buy(), Enum_Entry()
    elif order_type == '平多':
        orderDirct, entryOrExit = Enum_Sell(), Enum_Exit()
    elif order_type == '平多今':
        orderDirct, entryOrExit = Enum_Sell(), Enum_ExitToday()
    elif order_type == '开空':
        orderDirct, entryOrExit = Enum_Sell() , Enum_Entry()
    elif order_type == '平空':
        orderDirct, entryOrExit = Enum_Buy(), Enum_Exit()
    elif order_type == '平空今':
          orderDirct, entryOrExit = Enum_Buy(), Enum_ExitToday()
    else:
         return order_flag, session_id

    retCode, retMsg = A_SendOrder(orderDirct, entryOrExit, quantity,  price, symbol, account, enum_order)
    if retCode == 0:
        order_no_number = 0
        while True:
            time.sleep(1)
            session_id, order_no = A_GetOrderNo(retMsg)  # 获取下单编号对应的定单号和委托号
            if session_id:
                order_flag = True
                break
            order_no_number += 1
            if order_no_number >= 3:
                break
    
    if order_flag:
        if enum_order == '1':
            msg = f"当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} {order_type}仓，市价委托成功 价格:{price} 数量:{quantity} 订单号:{session_id}" 
        else:
            msg = f"当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} {order_type}仓，限价委托成功 价格:{price} 数量:{quantity} 订单号:{session_id}" 
    else:
        if enum_order == '1':
            msg = f"当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} {order_type}仓，没有检测到开仓委托订单号，市价委托失败"
        else:
            msg = f"当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} {order_type}仓，没有检测到开仓委托订单号，限价委托失败" 

    save_log(msg)

    return order_flag, session_id


# 策略初始化函数，策略开始运行时一次
def initialize(context):
    global delay_number_dict, create_signal_dict, order_dict, order_group_dict, order_file, group_file

    # 全局变量, 若要将修改后的变量值保存下来，则需要用global在函数内对变量进行标记
    if g_params['account']:
        SetUserNo(g_params['account'])  # 设置交易账户
        order_file = os.path.join(g_params['file_path'], f"{g_params['account']}-{g_params['barType']}-{g_params['barInterval']}-order.json")
        group_file = os.path.join(g_params['file_path'], f"{g_params['account']}-{g_params['barType']}-{g_params['barInterval']}-group.json")
    else:
        order_file = os.path.join(g_params['file_path'], f"{g_params['barType']}-{g_params['barInterval']}-order.json")
        group_file = os.path.join(g_params['file_path'], f"{g_params['barType']}-{g_params['barInterval']}-group.json")

    if not os.path.exists(g_params['file_path']):
        os.makedirs(g_params['file_path'])
        msg = f"配置文件路径:{g_params['file_path']} 不存在，程序自动创建此路径..."
        LogInfo(msg)
        UnloadStrategy()  # 停止策略

    config_file = os.path.join(g_params['file_path'], g_params['file_name'])  # 配置文件
    if not os.path.exists(config_file):
        msg = f"配置文件:{g_params['file_name']} 不存在..."
        LogInfo(msg)
        UnloadStrategy()  # 停止策略

    if not g_params['sheet_name']:
        msg = f"配置文件:{g_params['sheet_name']} sheet表不存在..."
        LogInfo(msg)
        UnloadStrategy()  # 停止策略

    try:
        df = pd.read_excel(config_file, sheet_name=g_params['sheet_name'])
        symbol_list = df['主力合约代码'].to_list()
    except Exception as e :
        LogInfo('合约信息配置文件格式有误...', e)
        UnloadStrategy()  # 停止策略

    if not symbol_list:
        LogInfo('合约数量为0无法订阅...')
        UnloadStrategy()  # 停止策略

    if len(symbol_list) > 50:
        LogInfo('合约每次只能订阅50个...')
        UnloadStrategy()  # 停止策略

    money = g_params['target']
    for loss in range(g_params['max_loss'] + 1):
        target_dict[loss] = money
        money *= 2

    if g_params['order_group']:
        order_group = int(g_params['order_group'])
    else:
        order_group = 2
    
    for i in range(1, order_group + 1):
        order_group_dict[f'组别{i}'] = {
                                        '是否下单': 1, 
                                        '订单总数': 0, 
                                        '盈亏总额': 0, 
                                        '盈利次数': 0, 
                                        '盈利金额': 0, 
                                        '亏损次数': 0, 
                                        '亏损金额': 0, 
                                        '保本次数': 0, 
                                        '当前止损次数': 0, 
                                        '最小幅度': None , 
                                        '最大幅度': None, 
                                        '当前合约': None, 
                                        '合约名称': None}

    if g_params['k_number']:
        k_number = g_params['k_number'] + 1
    else:
        k_number = 51  # k线数量默认51

    for symbol in symbol_list:
        SetBarInterval(symbol, g_params['barType'], g_params['barInterval'], k_number, k_number, True)  # 订阅合约
        order_dict[symbol] = {'s_flag_date_time': None, 's_flag_open': None, 's_flag_high': None, 's_flag_low': None, 's_flag_close': None,
                              'b_flag_date_time': None, 'b_flag_open': None, 'b_flag_high': None, 'b_flag_low': None, 'b_flag_close': None,
                              'order': []}   
        delay_number_dict[symbol] = 0
        create_signal_dict[symbol] = False

    SetTriggerType(1)  # 即时行情触发
    SetTriggerType(5)  # K线触发
    SetOrderWay(2)  # K线完成后发单
    SetActual()  # 设置策略在实盘上运行

    read_order_file()  # 读取order文件
    read_group_file()  # 读取group文件


# 策略执行函数，策略触发事件每次触发时都会调用一次
def handle_data(context):
    global delay_number_dict, create_signal_dict, new_order_dict, order_dict, order_group_dict, symbol_dict, random_symbol, log_file

    # 设置多种触发方式分类处理
    trigger_type_dict = {'T': '定时触发', 'C': '周期性触发', 'K': '实时阶段K线触发', 'H': '回测阶段K线触发',
                         'S': '即时行情触发', 'O': '委托状态变化触发', 'N': '连接状态触发', 'Z': '市场状态触发',
                         'U': '主力合约换月触发'}

    if context.triggerType() == "H":
        return
    elif context.triggerType() != "K" and context.triggerType() != "S":
        # LogInfo(f"触发事件:{trigger_type_dict[context.triggerType()]}，非K线触发或即时行情触发...")
        return

    now = datetime.now()

    tomorrow = now + timedelta(days=1)

    start_time_1 = datetime(now.year, now.month, now.day, 0, 0)
    end_time_1 = datetime(now.year, now.month, now.day, 2, 35)
    
    start_time_2 = datetime(now.year, now.month, now.day, 8, 55)
    end_time_2 = datetime(now.year, now.month, now.day, 11, 35)

    start_time_3 = datetime(now.year, now.month, now.day, 13, 25)
    end_time_3 = datetime(now.year, now.month, now.day, 15, 5)

    start_time_4 = datetime(now.year, now.month, now.day, 20, 55)
    end_time_4 = datetime(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0)

    start_create_time_1 = datetime(now.year, now.month, now.day, 14, 59, 59)
    end_create_time_1 = datetime(now.year, now.month, now.day, 15, 0, 1)

    start_create_time_2 = datetime(now.year, now.month, now.day, 22, 59, 59)
    end_create_time_2 = datetime(now.year, now.month, now.day, 23, 0, 1)

    start_create_time_3 = datetime(now.year, now.month, now.day, 0, 59, 59)
    end_create_time_3 = datetime(now.year, now.month, now.day, 1, 0, 1)

    start_create_time_4 = datetime(now.year, now.month, now.day, 1, 59, 59)
    end_create_time_4 = datetime(now.year, now.month, now.day, 2, 0, 1)

    if not (start_time_1 <= now <= end_time_1 or start_time_2 <= now <= end_time_2 or start_time_3 <= now <= end_time_3 or start_time_4 <= now <= end_time_4):
        return

    trade_date = context.tradeDate()
    if g_params['account']:
        log_file = os.path.join(g_params['file_path'], f"{g_params['account']}-{g_params['barType']}-{g_params['barInterval']}-{trade_date}-log.txt")
    else:
        log_file = os.path.join(g_params['file_path'], f"{g_params['barType']}-{g_params['barInterval']}-{trade_date}-log.txt")

    symbol = context.contractNo()  # 获取当前触发合约
    exchange_no = ExchangeName(symbol)  # 交易所代码
    symbol_name = SymbolName(symbol)  # 当前触发合约名称
    
    symbol_dict.update({symbol: [symbol_name, exchange_no]})

    quote_svr_state = QuoteSvrState()  # 行情服务器的连接状态
    if quote_svr_state != 1:
        # LogInfo('行情服务器的连接状态异常...')
        return

    trade_svr_state = TradeSvrState(g_params['account'])  # 交易服务器的连接状态
    if trade_svr_state != 1:
        # LogInfo('交易服务器的连接状态异常...')
        return
    
    is_in_session = IsInSession(symbol)  # 判断操作系统的当前时间是否为指定合约的交易时间
    if is_in_session == 0:
        return

    buy_profit_loss = A_BuyProfitLoss(symbol, g_params['account'])  # 当前商品的买入持仓盈亏
    buy_position = A_BuyPosition(symbol, g_params['account'])
    buy_avg_price = A_BuyAvgPrice(symbol, g_params['account'])
    
    sell_profit_loss = A_SellProfitLoss(symbol, g_params['account'])  # 当前商品的卖出持仓盈亏
    sell_position = A_SellPosition(symbol, g_params['account'])
    sell_avg_price = A_SellAvgPrice(symbol, g_params['account'])
    
    queue_order_list = A_AllQueueOrderNo(symbol, g_params['account'])  # 返回指定账户排队(可撤)定单号

    date_str = str(Date(symbol, g_params['barType'], g_params['barInterval']))
    time_str = '%06d' % int(Time(symbol, g_params['barType'], g_params['barInterval']) * 1000000)
    k_date_time = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]} {time_str[:2]}:{time_str[2:4]}:{time_str[4:]}"  # 开盘时间

    if context.triggerType() == "K" and not create_signal_dict[symbol]:
        delay_number_dict[symbol] = 0
        create_signal(k_date_time, symbol, exchange_no, symbol_name, buy_position, sell_position)  # 创建信号
        create_signal_dict[symbol] = True

    elif start_create_time_1 <= now <= end_create_time_1 and not create_signal_dict[symbol]:
        delay_number_dict[symbol] = 0
        create_signal(k_date_time, symbol, exchange_no, symbol_name, buy_position, sell_position)  # 创建信号
        create_signal_dict[symbol] = True

    elif start_create_time_2 <= now <= end_create_time_2 and not create_signal_dict[symbol]:
        delay_number_dict[symbol] = 0
        create_signal(k_date_time, symbol, exchange_no, symbol_name, buy_position, sell_position)  # 创建信号
        create_signal_dict[symbol] = True

    elif start_create_time_3 <= now <= end_create_time_3 and not create_signal_dict[symbol]:
        delay_number_dict[symbol] = 0
        create_signal(k_date_time, symbol, exchange_no, symbol_name, buy_position, sell_position)  # 创建信号
        create_signal_dict[symbol] = True

    elif start_create_time_4 <= now <= end_create_time_4 and not create_signal_dict[symbol]:
        delay_number_dict[symbol] = 0
        create_signal(k_date_time, symbol, exchange_no, symbol_name, buy_position, sell_position)  # 创建信号
        create_signal_dict[symbol] = True

    if context.triggerType() == "S":
        # 止盈止损逻辑=====================================================================================================================================================
        for i in range(len(order_dict[symbol]['order'])):
            flag = order_dict[symbol]['order'][i]['flag']
            flag_date_time = order_dict[symbol]['order'][i]['flag_date_time']
            flag_high = order_dict[symbol]['order'][i]['flag_high']
            flag_low = order_dict[symbol]['order'][i]['flag_low']
            order_type = order_dict[symbol]['order'][i]['order_type']
            price = order_dict[symbol]['order'][i]['price']
            count = order_dict[symbol]['order'][i]['count']
            quantity = order_dict[symbol]['order'][i]['quantity']
            close_quantity = order_dict[symbol]['order'][i]['close_quantity']
            group = order_dict[symbol]['order'][i]['group']
            open_order_no = order_dict[symbol]['order'][i]['open_order_no']
            close_order_no = order_dict[symbol]['order'][i]['close_order_no']
            order_message = order_dict[symbol]['order'][i]['order_message']
            update_price_position = order_dict[symbol]['order'][i]['update_price_position']
            create_order_time = order_dict[symbol]['order'][i]['create_order_time']
            cancel_order_time = order_dict[symbol]['order'][i]['cancel_order_time']

            if open_order_no in queue_order_list:
                order_time = A_OrderTime(open_order_no)  # 委托单的委托时间
                if order_time:
                    order_time = str(int(order_time * 1000000))
                    order_time_str = f"{order_time[:4]}-{order_time[4:6]}-{order_time[6:8]} {order_time[8:10]}:{order_time[10:12]}:{order_time[12:14]}"
                    if now - datetime.strptime(order_time_str, _format) >= timedelta(minutes=g_params['minutes']):
                        delete_order = A_DeleteOrder(open_order_no)  # 撤单
                        if delete_order:
                            order_dict[symbol]['order'][i]['remove'] = True
                            if order_type == '开多':
                                msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 订单号:{open_order_no} 开多仓委托未成交，撤销委托单成功！'
                                save_log(msg)
                            else:
                                msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 订单号:{open_order_no} 开空仓委托未成交，撤销委托单成功！'
                                save_log(msg)
                continue
            else:
                order_status = A_OrderStatus(open_order_no)  # 指定帐户下当前商品的某个委托单的状态
                if order_status and order_status != 'N':
                    if order_status in ['0', '1', '2', '3', '4', '7', '8', '9', 'B', 'F']:
                        order_time = A_OrderTime(open_order_no)  # 委托单的委托时间
                        if order_time:
                            order_time = str(int(order_time * 1000000))
                            order_time_str = f"{order_time[:4]}-{order_time[4:6]}-{order_time[6:8]} {order_time[8:10]}:{order_time[10:12]}:{order_time[12:14]}"
                            if now - datetime.strptime(order_time_str, _format) >= timedelta(minutes=g_params['minutes']):
                                delete_order = A_DeleteOrder(open_order_no)  # 撤单
                                if delete_order:
                                    order_dict[symbol]['order'][i]['remove'] = True
                                    if order_type == '开多':
                                        msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 订单号:{open_order_no} 开多仓委托成交失败，撤销委托单成功！'
                                        save_log(msg)
                                    else:
                                        msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 订单号:{open_order_no} 开空仓委托成交失败，撤销委托单成功！'
                                        save_log(msg)
                        else:
                            order_dict[symbol]['order'][i]['remove'] = True
                            if order_type == '开多':
                                msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 订单号:{open_order_no} 开多仓委托成交失败！'
                                save_log(msg)
                            else:
                                msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 订单号:{open_order_no} 开空仓委托成交失败！'
                                save_log(msg)
                    elif order_status in ['5', '6']:
                        if not update_price_position:
                            order_price = A_OrderFilledPrice(open_order_no)  # 返回指定帐户下当前商品的某个委托单的成交价格
                            if order_price and order_price != price:
                                msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 订单号:{open_order_no} 委托价:{price} 成交价:{order_price} 更新价格为实际成交价'
                                save_log(msg)
                                order_dict[symbol]['order'][i]['price'] = order_price
                            order_quantity = A_OrderFilledLot(open_order_no)  # 返回指定帐户下当前商品的某个委托单的成交数量
                            if order_quantity and order_quantity != quantity:
                                msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 订单号:{open_order_no} 委托量:{quantity} 成交量:{order_quantity} 更新数量为实际成交量'
                                save_log(msg)
                                order_dict[symbol]['order'][i]['quantity'] = order_quantity
                                order_dict[symbol]['order'][i]['close_quantity'] = order_quantity

                            order_dict[symbol]['order'][i]['update_price_position'] = True
                else:
                    if not update_price_position:
                        order_dict[symbol]['order'][i]['remove'] = True
                    
            if not cancel_order_time:
                profit, loss = False, False
                new_price = Q_Last(symbol)
                price_tick = PriceTick(symbol)
                if order_type == '开多':
                    profit_price = price + count  # 止盈价格
                    loss_price = price - count  # 止损价格
                    if new_price >= profit_price + price_tick * g_params['profit_number']:
                        profit, loss = True, False
                        msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 信号产生K线时间:{flag_date_time} 当前价格:{new_price} 突破标志性k线{flag}的最低价:{flag_low} 满足多单止盈条件'
                        save_log(msg)
                    elif new_price <= loss_price - price_tick * g_params['loss_number']:
                        profit, loss = False, True
                        msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 信号产生K线时间:{flag_date_time} 当前价格:{new_price} 跌破标志性k线{flag}的最低价:{flag_low} 满足多单止损条件'
                        save_log(msg)
                else:
                    profit_price = price - count  # 止盈价格
                    loss_price = price + count  # 止损价格
                    if new_price <= profit_price - price_tick * g_params['profit_number']:
                        profit, loss = True, False
                        msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 信号产生K线时间:{flag_date_time} 当前价格:{new_price} 突破标志性k线{flag}的最高价:{flag_high} 满足空单止盈条件'
                        save_log(msg)
                    elif new_price >= loss_price + price_tick * g_params['loss_number']:
                        profit, loss = False, True
                        msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 信号产生K线时间:{flag_date_time} 当前价格:{new_price} 突破标志性k线{flag}的最高价:{flag_high} 满足空单止损条件'
                        save_log(msg)

                if profit or loss:
                    order_no_list = []
                    if exchange_no in ['SHFE', 'INE']:
                        enum_order = '2'
                        if order_type == '开多':
                            today_position = A_TodayBuyPosition(symbol, g_params['account'])  # 当前商品的当日买入持仓
                            yesterday_position = buy_position - today_position
                        else:
                            today_position = A_TodaySellPosition(symbol, g_params['account'])  # 当前商品的当日卖出持仓
                            yesterday_position = sell_position - today_position
                        
                        if yesterday_position > 0:
                            if yesterday_position >= close_quantity:
                                if order_type == '开多':
                                    send_order_list = [k_date_time, '平多', close_quantity, new_price]
                                else:
                                    send_order_list = [k_date_time, '平空', close_quantity, new_price]
                                order_flag, session_id = send_order(g_params['account'], symbol, exchange_no, symbol_name, send_order_list, enum_order)
                                if order_flag:
                                    order_no_list.append(session_id)
                            else:
                                if order_type == '开多':
                                    send_order_list = [k_date_time, '平多', yesterday_position, new_price]
                                else:
                                    send_order_list = [k_date_time, '平空', yesterday_position, new_price]
                                order_flag, session_id = send_order(g_params['account'], symbol, exchange_no, symbol_name, send_order_list, enum_order)
                                if order_flag:
                                    order_no_list.append(session_id)
                                
                                if order_type == '开多':
                                    send_order_list = [k_date_time, '平多今', close_quantity - yesterday_position, new_price]
                                else:
                                    send_order_list = [k_date_time, '平空今', close_quantity - yesterday_position, new_price]
                                order_flag, session_id = send_order(g_params['account'], symbol, exchange_no, symbol_name, send_order_list, enum_order)
                                if order_flag:
                                    order_no_list.append(session_id)
                        else:
                            if order_type == '开多':
                                send_order_list = [k_date_time, '平多今', close_quantity, new_price]
                            else:
                                send_order_list = [k_date_time, '平空今', close_quantity, new_price]
                            order_flag, session_id = send_order(g_params['account'], symbol, exchange_no, symbol_name, send_order_list, enum_order)
                            if order_flag:
                                order_no_list.append(session_id)
                    else:
                        enum_order = str(g_params['close_order_type'])
                        if order_type == '开多':
                            send_order_list = [k_date_time, '平多', close_quantity, new_price]
                        else:
                            send_order_list = [k_date_time, '平空', close_quantity, new_price]
                        order_flag, session_id = send_order(g_params['account'], symbol, exchange_no, symbol_name, send_order_list, enum_order)
                        if order_flag:
                            order_no_list.append(session_id)

                    if order_no_list:
                        order_dict[symbol]['order'][i]['close_order_no'] = order_no_list
                        order_dict[symbol]['order'][i]['cancel_order_time'] = now.strftime(_format)
            else:
                delete_order_flag = False
                for order_no in close_order_no:
                    if order_no in queue_order_list:
                        delete_order_flag = True
                        order_time = A_OrderTime(order_no)  # 委托单的委托时间
                        if order_time:
                            order_time = str(int(order_time * 1000000))
                            order_time_str = f"{order_time[:4]}-{order_time[4:6]}-{order_time[6:8]} {order_time[8:10]}:{order_time[10:12]}:{order_time[12:14]}"
                            if now - datetime.strptime(order_time_str, _format) >= timedelta(seconds=g_params['seconds']):
                                delete_order = A_DeleteOrder(order_no)  # 撤单
                                if delete_order:
                                    if order_type == '开多':
                                        msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 订单号:{order_no} 平多仓委托未成交，撤销委托单成功！'
                                        save_log(msg)
                                    else:
                                        msg = f'当前K线时间:{k_date_time} 交易所:{exchange_no} 合约名称:{symbol_name} 组别:{group} 订单号:{order_no} 平空仓委托未成交，撤销委托单成功！'
                                        save_log(msg)
                        continue
                    
                    order_status = A_OrderStatus(order_no)  # 指定帐户下当前商品的某个委托单的状态
                    if order_status in ['5', '6', 'A']:
                        order_quantity = A_OrderFilledLot(order_no)  # 返回指定帐户下当前商品的某个委托单的成交数量
                        order_price = A_OrderFilledPrice(order_no)  # 返回指定帐户下当前商品的某个委托单的成交价格
                        if order_type == '开多':
                            profit_loss = round(float((order_price - price) * ContractUnit(symbol) * order_quantity), 2)
                        else:
                            profit_loss = round(float((price - order_price) * ContractUnit(symbol) * order_quantity), 2)
                        
                        order_dict[symbol]['order'][i]['order_message'].update({order_no: [order_quantity, order_price, profit_loss]})

                if not delete_order_flag:
                    all_quantity = sum([value_list[0] for key, value_list in order_message.items()])
                    if all_quantity >= quantity:
                        order_dict[symbol]['order'][i]['cancel_order_time'] = None
                        order_dict[symbol]['order'][i]['remove'] = True
                    else:
                        order_dict[symbol]['order'][i]['cancel_order_time'] = None
                        if int(quantity - all_quantity) >= g_params['quantity']:
                            order_dict[symbol]['order'][i]['close_quantity'] = int(quantity - all_quantity)
                        else:
                            order_dict[symbol]['order'][i]['remove'] = True

        new_order_list = []
        for i in range(len(order_dict[symbol]['order'])):
            remove = order_dict[symbol]['order'][i]['remove']
            if remove:
                order_message = order_dict[symbol]['order'][i]['order_message']
                profit_loss = sum([value_list[2] for key, value_list in order_message.items()])
                group = order_dict[symbol]['order'][i]['group']
                if profit_loss > 0:
                    order_group_dict[group]['止盈次数'] += 1
                    order_group_dict[group]['止盈金额'] += profit_loss
                    order_group_dict[group]['盈亏总额'] += profit_loss
                    order_group_dict[group]['当前止损次数'] = 0
                elif profit_loss < 0:
                    order_group_dict[group]['止损次数'] += 1
                    order_group_dict[group]['止损金额'] += profit_loss 
                    order_group_dict[group]['盈亏总额'] += profit_loss
                    if order_group_dict[group]['当前止损次数'] < g_params['max_loss']:
                        order_group_dict[group]['当前止损次数'] += 1
                else:
                    order_group_dict[group]['保本次数'] += 1
                
                order_group_dict[group]['订单总数'] += 1
                order_group_dict[group]['当前合约'] = None
                order_group_dict[group]['合约名称'] = None
            else:
                new_order_list.append(order_dict[symbol]['order'][i])
                
        order_dict[symbol]['order'] = new_order_list

        # 下单逻辑=========================================================================================================================================================
        if delay_number_dict[symbol] < g_params['delay_number']:
            delay_number_dict[symbol] += 1
        else:
            create_signal_dict[symbol] = False
            
            if new_order_dict and symbol in new_order_dict:
                if not random_symbol:
                    send_symbol_list = list(new_order_dict.keys())
                    send_symbol_name_list = [symbol_dict[send_symbol][0] for send_symbol in send_symbol_list]
                    random_symbol = random.choice(send_symbol_list)
                    random_symbol_name = symbol_dict[random_symbol][0]
                    random_symbol_exchange = symbol_dict[random_symbol][1]
                    msg = f'当前K线时间:{k_date_time} 本次符合下单条件合约:{send_symbol_name_list} 随机选中合约:{random_symbol_name} 交易所:{random_symbol_exchange}'
                    save_log(msg)
                
                new_order_dict = {key: value for key, value in new_order_dict.items() if key == random_symbol}
                if random_symbol == symbol:
                    order_type = new_order_dict[symbol]['order_type']
                    count = new_order_dict[symbol]['count']
                    group = new_order_dict[symbol]['group']
                    new_loss = order_group_dict[group]['当前止损次数']
                    quantity = round(target_dict[new_loss] / count / ContractUnit(symbol))
                    if quantity < g_params['quantity']:
                        quantity = g_params['quantity']

                    price = new_order_dict[symbol]['price']
                    
                    send_order_list = [k_date_time, order_type, quantity, price]
                    if exchange_no in ['SHFE', 'INE']:
                        enum_order = '2'
                    else:
                        enum_order = str(g_params['open_order_type'])
                    
                    order_flag, session_id = send_order(g_params['account'], symbol, exchange_no, symbol_name, send_order_list, enum_order)
                    if order_flag:
                        order_group_dict[group]['当前合约'] = symbol
                        order_group_dict[group]['合约名称'] = symbol_name
                        new_order_dict[symbol]['quantity'] = quantity
                        new_order_dict[symbol]['close_quantity'] = quantity
                        new_order_dict[symbol]['open_order_no'] = session_id
                        new_order_dict[symbol]['create_order_time'] = now.strftime(_format)
                        order_dict[symbol]['order'].append(new_order_dict[symbol])
                    del new_order_dict[symbol]
                    random_symbol = None

    write_order_file()  # 写入order文件
    write_group_file()  # 写入group文件


# 历史回测阶段结束时执行该函数一次
def hisover_callback(context):
    pass


# 策略退出前执行该函数一次
def exit_callback(context):
    pass
