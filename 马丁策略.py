import os
import re
import csv
import copy
import json
import time
import hashlib
import warnings
import pandas as pd
from decimal import Decimal
from configparser import ConfigParser
from datetime import datetime, timedelta
from binance.um_futures import UMFutures


cf = ConfigParser()

warnings.simplefilter(action='ignore', category=FutureWarning)  # 禁用 FutureWarning 警告

pd.set_option('mode.chained_assignment', None)


# hashlib加密
def encrypt_password(password):
    # 创建一个 hashlib 对象
    hasher = hashlib.sha256()

    # 使用 update() 方法更新 hasher 对象的内容
    hasher.update(password.encode('utf-8'))

    # 返回哈希值的十六进制表示
    return hasher.hexdigest()


# 获取小数点位数
def get_decimal_place(number):
    number_str = str(number)
    if 'e+' in number_str:
        number_list = number_str.split('e+')
        decimal_number = Decimal(number_list[0])
        exponent = decimal_number.as_tuple().exponent
        return abs(int(exponent)) - int(number_list[1])
    elif 'e-' in number_str:
        number_list = number_str.split('e-')
        decimal_number = Decimal(number_list[0])
        exponent = decimal_number.as_tuple().exponent
        return abs(int(exponent)) + int(number_list[1])
    elif '.' in number_str:
        decimal_number = Decimal(number_str)
        exponent = decimal_number.as_tuple().exponent
        return abs(int(exponent))
    else:
        return 0


class MartinStrategy:
    def __init__(self):
        self.name = '马丁策略'  # 策略名称
        self.pass_word = 'zhang'  # 校验码
        self.run_flag = True  # 策略运行
        self.file_path = './'  # 文件路径
        self.config_file = os.path.join(self.file_path, f'{self.name}-config.ini')

        self.author = ''  # 作者
        self.key = ''  # KEY
        self.secret = ''  # SECRET
        self.proxies = ''  # 代理地址
        self.symbol_number = 20  # 合约数量
        self.more_position = 0  # 合约多仓（0否，1是）
        self.interval = '5m'  # K线周期
        self.k_number = 50  # K线数量
        self.s_buy = 1  # s信号多单（0否，1是）
        self.s_sell = 1  # s信号空单（0否，1是）
        self.b_buy = 1  # b信号多单（0否，1是）
        self.b_sell = 1  # b信号空单（0否，1是）
        self.target = 100  # 目标金额
        self.order_group = 5  # 订单组数
        self.max_loss = 8  # 最大止损次数
        self.profit_number = 1  # 止盈滑点倍数
        self.loss_number = 0  # 止损滑点倍数
        self.minutes = 180  # 开仓延时撤单秒数
        self.seconds = 60  # 止盈止损延时撤单秒数
        self.open_order_type = 2  # 开仓类型（1市价，2限价）
        self.close_order_type = 2  # 平仓类型（1市价，2限价）
        self.refresh = 0.5  # 刷新频率

        self.info_dict = {}
        self.order_dict = {}
        self.save_order_dict = {}
        self.order_group_dict = {}
        self.save_order_group_dict = {}
        self.new_order_dict = {}
        self.all_symbol_list = []
        self.order_file = None
        self.group_file = None
        self.log_file = None
        self._format = '%Y-%m-%d %H:%M:%S'
        self.password = ''

        self.columns = ['open_time', 'open', 'high', 'low', 'close', 'volume', '收盘时间', '成交额', '成交笔数',
                        '主动买入成交量', '主动买入成交额', '请忽略该参数']
        self.new_columns = ['open_time', 'open', 'high', 'low', 'close', 'volume']

        self.get_config()  # 获取配置文件

        if not self.author or not self.key or not self.secret:
            print(f'请填写必要的配置文件信息后运行程序...')
            self.run_flag = False
            time.sleep(5)
            return

        if self.proxies:
            self.futures_client = UMFutures(key=self.key, secret=self.secret,
                                            proxies={'https': f'http://{self.proxies}'})
        else:
            self.futures_client = UMFutures(key=self.key, secret=self.secret)

        self.info_dict = self.get_info()  # 获取交易规则和交易对
        if not self.info_dict:
            print(f'获取交易规则和交易对失败，策略停止运行...')
            self.run_flag = False
            time.sleep(5)
            return

    # 获取配置文件
    def get_config(self):
        if not os.path.exists(self.config_file):
            cf.add_section('base')
            cf.set('base', 'author', self.author)
            cf.set('base', 'key', self.key)
            cf.set('base', 'secret', self.secret)
            cf.set('base', 'proxies', self.proxies)
            cf.set('base', 'symbol_number', f'{self.symbol_number}')
            cf.set('base', 'more_position', f'{self.more_position}')
            cf.set('base', 'interval', self.interval)
            cf.set('base', 'k_number', f'{self.k_number}')
            cf.set('base', 's_buy', f'{self.s_buy}')
            cf.set('base', 's_sell', f'{self.s_sell}')
            cf.set('base', 'b_buy', f'{self.b_buy}')
            cf.set('base', 'b_sell', f'{self.b_sell}')
            cf.set('base', 'target', f'{self.target}')
            cf.set('base', 'order_group', f'{self.order_group}')
            cf.set('base', 'max_loss', f'{self.max_loss}')
            cf.set('base', 'profit_number', f'{self.profit_number}')
            cf.set('base', 'loss_number', f'{self.loss_number}')
            cf.set('base', 'minutes', f'{self.minutes}')
            cf.set('base', 'seconds', f'{self.seconds}')
            cf.set('base', 'open_order_type', f'{self.open_order_type}')
            cf.set('base', 'close_order_type', f'{self.close_order_type}')
            cf.set('base', 'refresh', f'{self.refresh}')
            cf.add_section('encrypt')
            cf.set('encrypt', 'password', self.password)
            with open(self.config_file, 'w') as w:
                cf.write(w)

            print('配置文件不存在，系统将自动生成配置文件模板，请按照模板格式进行填写！')
            self.run_flag = False
            time.sleep(5)
            return
        else:
            cf.read(self.config_file)
            try:
                self.author = cf.get('base', 'author')
                self.key = cf.get('base', 'key')
                self.secret = cf.get('base', 'secret')
                self.proxies = cf.get('base', 'proxies')
                self.symbol_number = cf.get('base', 'symbol_number')
                self.more_position = cf.get('base', 'more_position')
                self.interval = cf.get('base', 'interval')
                self.k_number = int(cf.get('base', 'k_number'))
                self.s_buy = float(cf.get('base', 's_buy'))
                self.s_sell = float(cf.get('base', 's_sell'))
                self.b_buy = float(cf.get('base', 'b_buy'))
                self.b_sell = float(cf.get('base', 'b_sell'))
                self.target = float(cf.get('base', 'target'))
                self.order_group = float(cf.get('base', 'order_group'))
                self.max_loss = float(cf.get('base', 'max_loss'))
                self.profit_number = float(cf.get('base', 'profit_number'))
                self.loss_number = float(cf.get('base', 'loss_number'))
                self.minutes = float(cf.get('base', 'minutes'))
                self.seconds = float(cf.get('base', 'seconds'))
                self.open_order_type = int(cf.get('base', 'open_order_type'))
                self.close_order_type = int(cf.get('base', 'close_order_type'))
                self.refresh = float(cf.get('base', 'refresh'))
                self.password = cf.get('encrypt', 'password')
            except Exception as e_text:
                print(f'配置文件格式有误，请修改后运行程序！', e_text)
                self.run_flag = False
                time.sleep(5)
                return

    # 密码校验
    def get_password(self, now_time):
        password_flag = True
        cf.read(self.config_file)
        try:
            self.password = cf.get('encrypt', 'password')  # 获取配置文件密码
        except Exception as e_text:
            self.save_log(f'配置文件格式有误，无法产生信号 {e_text}')

        password = encrypt_password(f'{self.pass_word}{now_time.year}{self.pass_word}')
        if self.password != password:
            self.save_log('配置文件密码有误，无法产生信号，请配置正确的密码！')
            password_flag = False

        return password_flag

    # 获取仓位数量
    def get_quantity(self, ct, ratio):
        cf.read(self.config_file)
        try:
            self.multiply = float(cf.get('quantity', 'multiply'))  # 仓位倍数
        except Exception as e_text:
            self.save_log(f'配置文件格式有误，无法获取仓位倍数，默认仓位倍数为：{self.multiply}，请及时修改配置文件 {e_text}')

        quantity = round(self.quantity_multiplier / ct * ratio * self.multiply, self.quantity_size)
        if quantity < self.min_quantity:
            quantity = self.min_quantity

        return quantity

    # 保存日志
    def save_log(self, msg):
        print(msg)
        with open(self.log_file, 'a', encoding='utf-8') as w:
            w.write(msg + '\n')

    # 获取交易规则和交易对
    def get_info(self):
        info_dict = {}
        try:
            info_response = self.futures_client.exchange_info()
            symbols = info_response['symbols']
            for each in symbols:
                status = each['status']
                contract_type = each['contractType']
                order_type_list = each['orderTypes']
                if status != 'TRADING' or contract_type != 'PERPETUAL':  # 永续合约
                    continue
                if 'LIMIT' not in order_type_list or 'MARKET' not in order_type_list:
                    continue

                temp_info_dict = {}

                # 数量小数点位数
                quantity_precision = each['quantityPrecision']
                # 价格小数点位数
                price_precision = each['pricePrecision']
                temp_info_dict.update({'数量小数点位数': quantity_precision, '价格小数点位数': price_precision})
                filters = each['filters']
                for i in filters:
                    filter_type = i['filterType']
                    # 价格限制
                    if filter_type == 'PRICE_FILTER':
                        # 价格上下限, 最大价格和最小价格
                        max_price, min_price = i['maxPrice'], i['minPrice']
                        # 最小价格间隔
                        tick_size = i['tickSize']
                        temp_info_dict.update({'最大价格': max_price, '最小价格': min_price, '最小价格间隔': tick_size})

                    # 限价订单数量限制
                    if filter_type == 'LOT_SIZE':
                        # 限价订单数量上下限, 最大数量和最小数量
                        max_qty, min_qty = i['maxQty'], i['minQty']
                        # 限价订单最小数量间隔
                        step_size = i['stepSize']
                        temp_info_dict.update(
                            {'限价最大数量': max_qty, '限价最小数量': min_qty, '限价最小数量间隔': step_size})

                    # 市价订单数量限制
                    if filter_type == 'MARKET_LOT_SIZE':
                        # 市价订单数量上下限, 最大数量和最小数量
                        market_max_qty, market_min_qty = i['maxQty'], i['minQty']
                        # 市价订单最小数量间隔
                        market_step_size = i['stepSize']
                        temp_info_dict.update({'市价最大数量': market_max_qty, '市价最小数量': market_min_qty,
                                          '市价最小数量间隔': market_step_size})

                    # 最多订单数限制
                    if filter_type == 'MAX_NUM_ORDERS':
                        limit = i['limit']
                        temp_info_dict.update({'最多订单数限制': limit})

                    # 最多条件订单数限制
                    if filter_type == 'MAX_NUM_ALGO_ORDERS':
                        algo_limit = i['limit']
                        temp_info_dict.update({'最多条件订单数限制': algo_limit})

                    # 最小名义价值
                    if filter_type == 'MIN_NOTIONAL':
                        notional = i['notional']
                        temp_info_dict.update({'最小名义价值': notional})

                    # 价格比限制
                    if filter_type == 'PERCENT_PRICE':
                        # 价格上限百分比
                        multiplier_dp = i['multiplierUp']
                        # 价格下限百分比
                        multiplier_down = i['multiplierDown']
                        # 价格百分比小数点位数
                        multiplier_decimal = i['multiplierDecimal']
                        temp_info_dict.update({'价格上限百分比': multiplier_dp, '价格下限百分比': multiplier_down, '价格百分比小数点位数': multiplier_decimal})

                info_dict.update({each['symbol']: temp_info_dict})
        except Exception as error_text:
            print(f"获取交易规则和交易对失败 {error_text}")

        return info_dict

    # 获取24小时价格改变
    def get_24hr_price_change(self):
        symbol_price_change = []
        try:
            price_24h_change = self.futures_client.ticker_24hr_price_change()
            for each in price_24h_change:
                symbol_price_change.append([each['symbol'], float(each['priceChangePercent'])])
        except Exception as error_text:
            print(f"获取交易规则和交易对失败 {error_text}")

        return symbol_price_change

    # 获取最小下单数量
    def get_min_quantity(self, close_price):
        for each in [['0.00001', 5], ['0.0001', 4], ['0.001', 3], ['0.01', 2], ['0.1', 1], ['1', 0]]:
            if self.step_size == each[0]:
                new_min = float(self.notional / close_price)
                new_place = get_decimal_place(new_min)  # 获取小数点位数
                if new_place > each[1]:
                    new_min_number = round(new_min, each[1])  # 保留小数个数
                    if new_min_number < new_min:
                        new_min_number = float(Decimal(str(new_min_number)) + Decimal(str(each[0])))
                else:
                    new_min_number = new_min

                self.min_quantity = round(new_min_number, self.quantity_size)

                break

    # 查询持仓情况
    def get_position(self):
        position_flag, position_list = False, []
        try:
            position_list = self.futures_client.get_position_risk(recvWindow=6000)
            position_flag = True
        except Exception as error_text:
            self.save_log(f'合约：{self.symbol} 查询持仓情况失败 {error_text}')

        return position_flag, position_list

    # 创建市价订单
    def create_order(self, symbol, quantity, side, position_side, order_type='MARKET'):
        order_id = ''
        try:
            order_response = self.futures_client.new_order(
                symbol=symbol,
                side=side,
                type=order_type,
                positionSide=position_side,
                quantity=quantity,
                recvWindow=6000
            )
            order_id = order_response.get('orderId')
            self.save_log(f'合约：{symbol} 创建市价订单成功 {order_response}')
        except Exception as error_text:
            self.save_log(f'合约：{symbol} 创建市价订单失败 {error_text}')

        time.sleep(self.refresh)

        return order_id

    # 读取order文件
    def read_order_file(self):
        if os.path.exists(self.order_file):
            with open(self.order_file, "r", encoding="utf-8") as f:
                self.save_order_dict = json.load(f)

        # 将字典转换为JSON字符串后比较
        if json.dumps(self.save_order_dict, sort_keys=True) != json.dumps(self.order_dict, sort_keys=True):
            for key_symbol, value_dict in self.save_order_dict.items():
                if key_symbol in self.order_dict:
                    self.order_dict[key_symbol] = copy.deepcopy(value_dict)

    # 写入order文件
    def write_order_file(self):
        # 将字典转换为JSON字符串后比较
        if json.dumps(self.save_order_dict, sort_keys=True) != json.dumps(self.order_dict, sort_keys=True):
            self.save_order_dict = copy.deepcopy(self.order_dict)
            with open(self.order_file, "w", encoding="utf-8") as w:
                json.dump(self.save_order_dict, w, indent=2, ensure_ascii=False)

    # 读取group文件
    def read_group_file(self):
        if os.path.exists(self.group_file):
            with open(self.group_file, "r", encoding="utf-8") as f:
                self.save_order_group_dict = json.load(f)

        # 将字典转换为JSON字符串后比较
        if json.dumps(self.save_order_group_dict, sort_keys=True) != json.dumps(self.order_group_dict, sort_keys=True):
            for key_group, value_dict in self.save_order_group_dict.items():
                if key_group in self.order_group_dict:
                    self.order_group_dict[key_group] = copy.deepcopy(value_dict)

    # 写入group文件
    def write_group_file(self):
        # 将字典转换为JSON字符串后比较
        if json.dumps(self.save_order_group_dict, sort_keys=True) != json.dumps(self.order_group_dict, sort_keys=True):
            self.save_order_group_dict = copy.deepcopy(self.order_group_dict)
            with open(self.group_file, "w", encoding="utf-8") as w:
                json.dump(self.save_order_group_dict, w, indent=2, ensure_ascii=False)

    # 程序入口
    def main(self):
        if not self.run_flag:
            return

        last_hour = None
        k_date_time = None
        while True:
            now = datetime.now()  # 当前时间
            now_stamp = now.strftime(self._format)
            current_hour = now.hour
            log_name = f'{self.name}-{self.author}-{self.interval}-{now.strftime("%Y%m%d")}-log.txt'
            self.log_file = os.path.join(self.file_path,  log_name)  # 日志文件

            # 每小时整运行获取24小时价格改变
            if last_hour != current_hour:
                print(f"每小时整运行获取24小时价格改变 - 当前时间小时: {now}")
                self.info_dict = self.get_info()  # 获取交易规则和交易对
                symbol_price_change = self.get_24hr_price_change()
                symbol_price_change = [each for each in symbol_price_change if each[0] in self.info_dict]
                symbol_price_change = sorted(symbol_price_change, key=lambda x: abs(x[1]), reverse=True)
                self.all_symbol_list = [each[0] for each in symbol_price_change][:self.symbol_number]
                last_hour = current_hour

            # position_flag, position_list = self.get_position()  # 查询持仓情况

            for symbol in self.all_symbol_list:
                step_size = float(self.info_dict[symbol]['市价最小数量间隔'])  # 市价最小数量间隔
                tick_size = float(self.info_dict[symbol]['最小价格间隔'])  # 最小价格间隔
                notional = float(self.info_dict[symbol]['最小名义价值'])  # 最小名义价值
                min_quantity = float(self.info_dict[symbol]['市价最小数量'])  # 市价最小数量
                quantity_size = get_decimal_place(step_size)  # 数量小数点位数
                price_size = get_decimal_place(tick_size)  # 价格小数点位数

                # self.buy_update_time = ''  # 多仓更新时间
                # self.buy_position = 0.0  # 买仓数量
                # self.buy_avg_price = 0.0  # 买入持仓均价
                # self.buy_realized_profit = 0.0  # 买入未实现盈亏
                # self.sell_update_time = ''  # 空仓更新时间
                # self.sell_position = 0.0  # 卖仓数量
                # self.sell_avg_price = 0.0  # 卖出持仓均价
                # self.sell_realized_profit = 0.0  # 卖出未实现盈亏
                # self.long_flag, self.short_flag = False, False

                try:
                    # 获取K线数据
                    k_line_data = self.futures_client.klines(symbol=symbol,
                                                             interval=self.interval,
                                                             limit=int(self.k_number + 2))
                except Exception as error_text:
                    self.save_log(f'获取K线数据失败 {error_text}')
                    time.sleep(self.refresh)
                    continue

                bar_stamp = datetime.fromtimestamp(k_line_data[-1][0] / 1000)
                open_price = float(k_line_data[-1][1])  # 开盘价
                high_price = float(k_line_data[-1][2])  # 最高价
                low_price = float(k_line_data[-1][3])  # 最低价
                close_price = float(k_line_data[-1][4])  # 收盘价

                if not k_date_time:
                    k_date_time = bar_stamp
                elif k_date_time != bar_stamp:
                    df_data = pd.DataFrame(k_line_data[:-1], columns=self.columns)
                    df_data = df_data[self.new_columns]
                    df_data['open'] = df_data['open'].astype(float)
                    df_data['high'] = df_data['high'].astype(float)
                    df_data['low'] = df_data['low'].astype(float)
                    df_data['close'] = df_data['close'].astype(float)

                    k_open = df_data['open'].iloc[-1]
                    k_high = df_data['high'].iloc[-1]
                    k_low = df_data['low'].iloc[-1]
                    k_close = df_data['close'].iloc[-1]

                    create_signal_flag = False
                    if self.more_position == 0:
                        pass
                        # if buy_position <= 0 and sell_position <= 0:
                        #     create_signal_flag = True
                    else:
                        create_signal_flag = True

                    if create_signal_flag:
                        self.read_group_file()  # 读取group文件
                        sorted_order_group_dict = dict(sorted(self.order_group_dict.items(),
                                                              key=lambda x: x[1]['当前止损次数'],
                                                              reverse=True))

                        group = None
                        for key_group, value_dict in sorted_order_group_dict.items():
                            if value_dict['是否下单'] and not value_dict['当前合约']:
                                group = key_group
                                break

                        if group:
                            min_amplitude = self.order_group_dict[group]['最小幅度']
                            max_amplitude = self.order_group_dict[group]['最大幅度']
                            if not min_amplitude or not max_amplitude:
                                if self.order_group_dict[group]['当前止损次数'] <= 3:
                                    min_amplitude, max_amplitude = 0.2, 0.6
                                elif self.order_group_dict[group]['当前止损次数'] == 4:
                                    min_amplitude, max_amplitude = 0.5, 2.0
                                elif self.order_group_dict[group]['当前止损次数'] == 5:
                                    min_amplitude, max_amplitude = 0.8, 2.0
                                else:
                                    min_amplitude, max_amplitude = 1.4, 2.5

                            flag_list = []
                            s_list = ['s', 's_flag_date_time', 's_flag_high', 's_flag_low']
                            b_list = ['b', 'b_flag_date_time', 'b_flag_high', 'b_flag_low']
                            s_flag_date_time = self.order_dict[symbol]['s_flag_date_time']
                            b_flag_date_time = self.order_dict[symbol]['b_flag_date_time']
                            if s_flag_date_time and not b_flag_date_time:
                                flag_list.append(s_list)
                            elif not s_flag_date_time and b_flag_date_time:
                                flag_list.append(b_list)
                            elif s_flag_date_time and b_flag_date_time:
                                if s_flag_date_time >= b_flag_date_time:
                                    flag_list.append(s_list)
                                    flag_list.append(b_list)
                                else:
                                    flag_list.append(b_list)
                                    flag_list.append(s_list)

                            for each in flag_list:
                                flag_high, flag_low = self.order_dict[symbol][each[2]], self.order_dict[symbol][each[3]]
                                if each[0] == 's' and self.s_buy == 1:
                                    if k_close > flag_high > k_low:
                                        count = abs(open_price - flag_low)  # 止盈止损点数
                                        amplitude = round(count / open_price * 100, 2)  # 振幅
                                        if min_amplitude < amplitude < max_amplitude:
                                            self.new_order_dict[symbol].update({'flag': each[0],
                                                                                'flag_date_time': bar_stamp,
                                                                                'flag_high': flag_high,
                                                                                'flag_low': flag_low,
                                                                                'order_type': '开多',
                                                                                'price': open_price,
                                                                                'count': count,
                                                                                'quantity': None,
                                                                                'close_quantity': None,
                                                                                'group': group,
                                                                                'open_order_no': None,
                                                                                'close_order_no': [],
                                                                                'order_message': {},
                                                                                'update_price_position': False,
                                                                                'create_order_time': None,
                                                                                'cancel_order_time': None,
                                                                                'remove': False})
                                            msg = (f'当前时间:{now_stamp} Bar时间:{bar_stamp} 合约名称:{symbol} 当前价格:{k_close} '
                                                   f'突破标志性k线{each[0]}的最高价:{flag_high} 振幅:{amplitude} 组别:{group} 产生开多信号')
                                            self.save_log(msg)
                                            break
                                        else:
                                            msg = (f'当前时间:{now_stamp} Bar时间:{bar_stamp} 合约名称:{symbol} 当前价格:{k_close} '
                                                   f'突破标志性k线{each[0]}的最高价:{flag_high} 振幅:{amplitude} 组别:{group} 振幅不在下单区间')
                                            self.save_log(msg)
                                if each[0] == 's' and self.s_sell == 1:
                                    if k_close < flag_low < k_high:
                                        count = abs(flag_high - open_price)  # 止盈止损点数
                                        amplitude = round(count / open_price * 100, 2)  # 振幅
                                        if min_amplitude < amplitude < max_amplitude:
                                            self.new_order_dict[symbol].update({'flag': each[0],
                                                                                'flag_date_time': bar_stamp,
                                                                                'flag_high': flag_high,
                                                                                'flag_low': flag_low,
                                                                                'order_type': '开空',
                                                                                'price': open_price,
                                                                                'count': count,
                                                                                'quantity': None,
                                                                                'close_quantity': None,
                                                                                'group': group,
                                                                                'open_order_no': None,
                                                                                'close_order_no': [],
                                                                                'order_message': {},
                                                                                'update_price_position': False,
                                                                                'create_order_time': None,
                                                                                'cancel_order_time': None,
                                                                                'remove': False})
                                            msg = (f'当前时间:{now_stamp} Bar时间:{bar_stamp} 合约名称:{symbol} 当前价格:{k_close} '
                                                   f'跌破标志性k线{each[0]}的最低价:{flag_low} 振幅:{amplitude} 组别:{group} 产生开空信号')
                                            self.save_log(msg)
                                            break
                                        else:
                                            msg = (f'当前时间:{now_stamp} Bar时间:{bar_stamp} 合约名称:{symbol} 当前价格:{k_close} '
                                                   f'跌破标志性k线{each[0]}的最低价:{flag_low} 振幅:{amplitude} 组别:{group} 振幅不在下单区间')
                                            self.save_log(msg)
                                if each[0] == 'b' and self.b_buy == 1:
                                    if k_close > flag_high > k_low:
                                        count = abs(open_price - flag_low)  # 止盈止损点数
                                        amplitude = round(count / open_price * 100, 2)  # 振幅
                                        if min_amplitude < amplitude < max_amplitude:
                                            self.new_order_dict[symbol].update({'flag': each[0],
                                                                                'flag_date_time': bar_stamp,
                                                                                'flag_high': flag_high,
                                                                                'flag_low': flag_low,
                                                                                'order_type': '开多',
                                                                                'price': open_price,
                                                                                'count': count,
                                                                                'quantity': None,
                                                                                'close_quantity': None,
                                                                                'group': group,
                                                                                'open_order_no': None,
                                                                                'close_order_no': [],
                                                                                'order_message': {},
                                                                                'update_price_position': False,
                                                                                'create_order_time': None,
                                                                                'cancel_order_time': None,
                                                                                'remove': False})
                                            msg = (f'当前时间:{now_stamp} Bar时间:{bar_stamp} 合约名称:{symbol} 当前价格:{k_close} '
                                                   f'突破标志性k线{each[0]}的最高价:{flag_high} 振幅:{amplitude} 组别:{group} 产生开多信号')
                                            self.save_log(msg)
                                            break
                                        else:
                                            msg = (f'当前时间:{now_stamp} Bar时间:{bar_stamp} 合约名称:{symbol} 当前价格:{k_close} '
                                                   f'突破标志性k线{each[0]}的最高价:{flag_high} 振幅:{amplitude} 组别:{group} 振幅不在下单区间')
                                            self.save_log(msg)
                                if each[0] == 'b' and self.b_sell == 1:
                                    if k_close < flag_low < k_high:
                                        count = abs(flag_high - open_price)  # 止盈止损点数
                                        amplitude = round(count / open_price * 100, 2)  # 振幅
                                        if min_amplitude < amplitude < max_amplitude:
                                            self.new_order_dict[symbol].update({'flag': each[0],
                                                                                'flag_date_time': bar_stamp,
                                                                                'flag_high': flag_high,
                                                                                'flag_low': flag_low,
                                                                                'order_type': '开空',
                                                                                'price': open_price,
                                                                                'count': count,
                                                                                'quantity': None,
                                                                                'close_quantity': None,
                                                                                'group': group,
                                                                                'open_order_no': None,
                                                                                'close_order_no': [],
                                                                                'order_message': {},
                                                                                'update_price_position': False,
                                                                                'create_order_time': None,
                                                                                'cancel_order_time': None,
                                                                                'remove': False})
                                            msg = (f'当前时间:{now_stamp} Bar时间:{bar_stamp} 合约名称:{symbol} 当前价格:{k_close} '
                                                   f'跌破标志性k线{each[0]}的最低价:{flag_low} 振幅:{amplitude} 组别:{group} 产生开空信号')
                                            self.save_log(msg)
                                            break
                                        else:
                                            msg = (f'当前时间:{now_stamp} Bar时间:{bar_stamp} 合约名称:{symbol} 当前价格:{k_close} '
                                                   f'跌破标志性k线{each[0]}的最低价:{flag_low} 振幅:{amplitude} 组别:{group} 振幅不在下单区间')
                                            self.save_log(msg)

                    # 计算标志性k线
                    max_high, min_low = max(df_data['high'].iloc[:-1]), min(df_data['low'].iloc[:-1])

                    if close_price > max_high:
                        self.order_dict[symbol].update({'s_flag_date_time': bar_stamp,
                                                        's_flag_open': k_open,
                                                        's_flag_high': k_high,
                                                        's_flag_low': k_low,
                                                        's_flag_close': k_close})
                        msg = (f'当前时间:{now_stamp} Bar时间:{bar_stamp} 合约名称:{symbol} 形成标志性k线s，'
                               f'开盘价:{k_open} 最高价:{k_high} 最低价:{k_low} 收盘价:{k_close}')
                        self.save_log(msg)

                    elif close_price < min_low:
                        self.order_dict[symbol].update({'b_flag_date_time': bar_stamp,
                                                        'b_flag_open': k_open,
                                                        'b_flag_high': k_high,
                                                        'b_flag_low': k_low,
                                                        'b_flag_close': k_close})
                        msg = (f'当前时间:{now_stamp} Bar时间:{bar_stamp} 合约名称:{symbol} 形成标志性k线b，'
                               f'开盘价:{k_open} 最高价:{k_high} 最低价:{k_low} 收盘价:{k_close}')
                        self.save_log(msg)

            time.sleep(self.refresh)


if __name__ == '__main__':
    martin_strategy = MartinStrategy()
    martin_strategy.main()

