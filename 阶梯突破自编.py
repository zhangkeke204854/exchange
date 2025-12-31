import os
import json
import copy
import talib
import random
import numpy as np
import pandas as pd
from collections import deque


g_params['userNo'] = 'Q1304843512'  # 交易账号
g_params['contractNo'] = 'SHFE|F|RB|2605'  # 合约代码
g_params['barType'] = 'M'  # k线类型
g_params['barInterval'] = 5  # k线周期
g_params['quantity'] = 1  # 下单数量
g_params['file_path'] = '/Users/zhangkeke'  # 文件路径


log_file = None
_format = '%Y-%m-%d %H:%M:%S'


# 保存日志
def save_log(msg):
    LogInfo(msg)
    with open(log_file, 'a', encoding='utf-8') as w:
        w.write(str(msg) + '\n')


# 策略开始运行时执行该函数一次
def initialize(context):
    SetBarInterval(g_params['contractNo'], g_params['barType'], g_params['barInterval'], 1000, 100)  # 订阅历史K线
    SetTriggerType(5)  # K线触发
    SetOrderWay(1)  # 实时发单
    SetActual()  # 设置实盘运行


# 策略触发事件每次触发时都会执行该函数
def handle_data(context):
    # 全局变量, 若要将修改后的变量值保存下来，则需要用global在函数内对变量进行标记
    global log_file

    trade_date = context.tradeDate()

    if g_params['userNo']:
        log_file = os.path.join(g_params['file_path'], f"{g_params['userNo']}-{g_params['barType']}-{g_params['barInterval']}-log.txt")
    else:
        log_file = os.path.join(g_params['file_path'], f"{g_params['barType']}-{g_params['barInterval']}-log.txt")

    if context.triggerType() != "K" and context.triggerType() != "H":
        return

    close_price = pd.Series(Close())
    open_price = pd.Series(Open())
    high_price = pd.Series(High())
    low_price = pd.Series(Low())

    for i in reversed(range(len(close_price))):
        k_flag = None
        if close_price[i] > open_price[i]:
            print("阳线")
            k_flag = '阳线'
        elif close_price[i] < open_price[i]:
            print("阴线")
            k_flag = '阴线'
        else:
            if high_price[i] - open_price[i] > close_price[i] - low_price[i]:
                print("上影线更长，阴线")
                k_flag = '阳线'
            elif high_price[i] - open_price[i] < close_price[i] - low_price[i]:
                print("下影线更长，阳线")
                k_flag = '阴线'
            else:
                k_flag = '十字线'
                print("等长十字线")

        if k_flag == '阳线':
            pass
            






    # # 判断K线类型
    # is_positive = close_price > open_price  # 阳线
    # is_negative = close_price < open_price  # 阴线

    # upper_shadow = high_price - np.maximum(open_price, close_price)
    # lower_shadow = np.minimum(open_price, close_price) - low_price

    # is_cross = close_price == open_price
    # long_lower = lower_shadow > upper_shadow   # 下影更长 → 算阳线
    # long_upper = upper_shadow > lower_shadow   # 上影更长 → 算阴线
    # equal_shadow = upper_shadow == lower_shadow

    # is_yang = is_positive | (is_cross & long_lower)
    # is_yin = is_negative | (is_cross & long_upper)

    # # 阳线阶梯检测（逐步抬高的低点）
    # bull_detection = pd.Series(np.nan, index=close_price.index)
    # bull_chain = deque()

    # for i in range(len(close_price)):
    #     if is_cross.iloc[i] and equal_shadow.iloc[i]:
    #         continue  # 忽略等长十字
    #     if is_yang.iloc[i]:
    #         curr_low = low_price.iloc[i]
    #         # 维持严格递增链
    #         while len(bull_chain) > 0 and bull_chain[-1] >= curr_low:
    #             bull_chain.pop()
    #         bull_chain.append(curr_low)
    #         # 保持最近4个（实现步进）
    #         if len(bull_chain) > 4:
    #             bull_chain.popleft()
    #         # 正好形成4个时（或继续步进后仍为4个），记录当前阶梯支撑位
    #         if len(bull_chain) == 4:
    #             bull_detection.iloc[i] = bull_chain[0]  # 第1根的最低点

    # # 阴线阶梯检测（逐步降低的高点）
    # bear_detection = pd.Series(np.nan, index=close_price.index)
    # bear_chain = deque()

    # for i in range(len(close_price)):
    #     if is_cross.iloc[i] and equal_shadow.iloc[i]:
    #         continue # 忽略等长十字
    #     if is_yin.iloc[i]:
    #         curr_high = high_price.iloc[i]
    #         # 维持严格递减链
    #         while len(bear_chain) > 0 and bear_chain[-1] <= curr_high:
    #             bear_chain.pop()
    #         bear_chain.append(curr_high)
    #         # 保持最近4个（实现步进）
    #         if len(bear_chain) > 4:
    #             bear_chain.popleft()
    #             # 正好形成4个时（或继续步进后仍为4个），记录当前阶梯阻力位
    #         if len(bear_chain) == 4:
    #             bear_detection.iloc[i] = bear_chain[0]  # 第1根的最高点

    # # 阶梯线（向前填充，实现水平延伸直到下一个点）
    # bull_step = bull_detection.ffill()  # 阳线阶梯支撑（黄色）
    # bear_step = bear_detection.ffill()  # 阴线阶梯阻力（绿色）

    # kk = pd.Series(np.nan, index=close_price.index)
    # kk[close_price > bear_step] = -1
    # kk[close_price < bull_step] = 1
    # kk = kk.fillna(method='ffill')

    # gg = pd.Series(np.nan, index=close_price.index)
    # gg[kk == -1] = bull_step[kk == -1]
    # gg[kk == 1] = bear_step[kk == 1]
    
    # if kk.iloc[-1] == 1 and kk.iloc[-2] == 1:
    #     PlotPartLine('green1', CurrentBar(), gg.iloc[-2], 1, gg.iloc[-2], RGB_Green())
    #     PlotStickLine('green2', gg.iloc[-2], gg.iloc[-1], RGB_Green())
    # elif kk.iloc[-1] == -1 and kk.iloc[-2] == -1:
    #     PlotPartLine('yellow1', CurrentBar(), gg.iloc[-2], 1, gg.iloc[-2], RGB_Yellow())
    #     PlotStickLine('yellow2', gg.iloc[-2], gg.iloc[-1], RGB_Yellow())
    # elif kk.iloc[-1] == 1 and kk.iloc[-2] == -1:
    #     PlotPartLine('yellow3', CurrentBar(), gg.iloc[-2], 1, gg.iloc[-2], RGB_Yellow())
    # elif kk.iloc[-1] == -1 and kk.iloc[-2] == 1:
    #     PlotPartLine('green3', CurrentBar(), gg.iloc[-2], 1, gg.iloc[-2], RGB_Green())

    # # ==================== 绘图部分（阳/阴阶梯） ====================
    # # 阳线阶梯（黄色，画在下方）
    # if pd.notna(bull_step.iloc[-1]) and pd.notna(bull_step.iloc[-2]):
    #     prev = bull_step.iloc[-2]
    #     curr = bull_step.iloc[-1]
    #     if curr == prev:  # 水平延伸
    #         PlotPartLine('yellow1', CurrentBar(), prev, 1, prev, RGB_Yellow())
    #     else:  # 阶梯向上跳变（新支撑更高）
    #         PlotPartLine('yellow3', CurrentBar(), prev, 1, prev, RGB_Yellow())
    #         PlotStickLine('yellow2', prev, curr, RGB_Yellow())

    # # 阴线阶梯（绿色，画在上方）
    # if pd.notna(bear_step.iloc[-1]) and pd.notna(bear_step.iloc[-2]):
    #     prev = bear_step.iloc[-2]
    #     curr = bear_step.iloc[-1]
    #     if curr == prev:  # 水平延伸
    #         PlotPartLine('green1', CurrentBar(), prev, 1, prev, RGB_Green())
    #     else:  # 阶梯向下跳变（新阻力更低）
    #         PlotPartLine('green2', CurrentBar(), prev, 1, prev, RGB_Green())
    #         PlotStickLine('green3', prev, curr, RGB_Green())
