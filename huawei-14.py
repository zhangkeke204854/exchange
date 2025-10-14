# 软件版本交叉排序
# 在现代软件开发中，版本号是追踪软件变更的关键。一个常见的版本号格式由 4 个部分组成，形式为 A.B.C.D，其中 A 代表主版本号，B 代表次版本号，C 代表修订号，D 代表构建号。每个部分都是一个从 0 到 255 的整数。
# 现在，您获得了一批软件的版本号列表。您的任务是根据这些版本号的数值大小，对它们进行一种特殊的“交叉排序”。排序后的输出顺序应为：版本号最小的、版本号最大的、版本号第二小的、版本号第二大的，以此类推。
# 版本号的比较遵循字典序，具体规则如下：
# 1. 首先比较主版本号 A 的值，数值较小者版本较低。
# 2. 如果主版本号 A 相同，则比较次版本号 B 的值。
# 3. 如果 A 和 B 都相同，则比较修订号 C 的值。
# 4. 如果 A、B 和 C 都相同，则比较构建号 D 的值。
# 输入描述：
# 1.  第一行为一个整数 N，代表版本号的数量。N的有效范围是 [1, 100]。
# 2.  接下来 N 行，每行为一个 A.B.C.D 格式的版本号字符串。
# 输出描述：
# 输出经过交叉排序后的版本号字符串，版本号之间用单个空格分隔。
# 示例1
# 输入例子：
# 5
# 1.126.127.128
# 3.36.80.34
# 35.107.224.55
# 101.21.35.63
# 80.42.126.88
# 输出例子：
# 1.126.127.128 101.21.35.63 3.36.80.34 80.42.126.88 35.107.224.55
#
# def main():
#     n = int(input())
#
#     versions = []
#
#     for _ in range(n):
#         version_str = input().strip()
#         versions.append(version_str)
#
#     print(versions)
#
#     # 将版本号转换为可比较的元组（整数形式）
#     def version_to_tuple(version):
#         parts = version.split('.')
#         return tuple(int(part) for part in parts)
#
#     # 按版本号排序
#     sorted_versions = sorted(versions, key=version_to_tuple)
#     print(sorted_versions)
#
#     # 交叉排序
#     result = []
#     left = 0
#     right = n - 1
#     take_small = True  # True表示取小的，False表示取大的
#
#     while left <= right:
#         if take_small:
#             result.append(sorted_versions[left])
#             left += 1
#         else:
#             result.append(sorted_versions[right])
#             right -= 1
#         take_small = not take_small
#
#     print(' '.join(result))
#
#
# if __name__ == "__main__":
#     main()

# 充电宝的高效率流转
# 在一个繁忙的外卖配送站中，有
# M
# 个充电宝（编号从
# 1
# 到
# M）可供骑手更换。现在有
# N
# 位骑手（按输入顺序编号从
# 1
# 到
# N）陆续到达充电站，需要更换电量耗尽的电池。
# 换电规则如下：
# - 当一位骑手到达时，他会立即归还正在使用的电池（此时该电池对应的充电宝可供下一位骑手使用）。
# - 然后，他会从当前所有可用的充电宝中，选择编号最小的一个来使用。
# - 充电宝一旦被占用，会持续充电一段时间，直到被下一位归还此充电宝的骑手释放。
# 所有骑手的到达时间都是唯一的。您的任务是，找出按输入顺序编号为
# K
# 的那位骑手，最终使用了哪个编号的充电宝。
# 时间限制：C / C + + 3
# 秒，其他语言6秒
# 空间限制：C / C + + 256
# M，其他语言512M
# 输入描述：
#
# 输出描述：
# 输出一个整数，代表编号为
# K
# 的骑手所使用的充电宝的编号。
# 示例1
# 输入例子：
# 12
# 8
# 4
# 50
# 1
# 14
# 32
# 15
# 2
# 22
# 88
# 42
# 14
# 25
# 14
# 9
# 40
# 35
# 50
# 输出例子：
# 3
#
# import heapq
#
#
# def main():
#     M, N, K = map(int, input().split())
#
#     riders = []
#     for i in range(N):
#         arrival, duration = map(int, input().split())
#         riders.append((arrival, duration, i))  # i是原始索引
#
#     # 按到达时间排序
#     riders.sort(key=lambda x: x[0])
#     print(riders)
#
#     # 可用充电宝的最小堆
#     available = list(range(1, M + 1))
#     print(available)
#     heapq.heapify(available)
#
#     # 释放事件堆：(release_time, power_bank_id)
#     release_events = []
#
#     # 记录每个原始骑手使用的充电宝
#     result = [0] * N
#
#     for arrival, duration, original_idx in riders:
#         # 处理所有在当前到达时间之前结束的释放事件
#         while release_events and release_events[0][0] <= arrival:
#             release_time, pb_id = heapq.heappop(release_events)
#             heapq.heappush(available, pb_id)
#
#         # 分配最小编号的可用充电宝
#         if available:
#             power_bank = heapq.heappop(available)
#             result[original_idx] = power_bank
#             release_time = arrival + duration
#             heapq.heappush(release_events, (release_time, power_bank))
#
#     # 输出第K个骑手（编号为K，对应索引K-1）使用的充电宝
#     print(result[K - 1])
#
#
# if __name__ == "__main__":
#     main()


# 仓储中心货物装箱
# 在一个自动化的大型仓储中心，机器人需要将一批货物打包到不同的集装箱中。
# 每个集装箱都有其固定的最大载重量，同时每件货物也有其自身的重量。
# 为了高效利用空间，一个集装箱内可以装入多件货物，但前提是货物的总重量不能超过集装箱的最大载重。
# 然而，由于货物是不可分割的，一件货物必须被完整地装入某一个集装箱中，不能分开装。
# 作为调度系统的工程师，您的任务是编写一个算法，以确定最多可以成功装箱多少件货物。
# 给定一个代表集装箱载重的数组
# C
# 和一个代表货物重量的数组
# W。请找出一个最优的装箱方案，使得能够被装箱的货物数量最多。
# 输入描述：
#
# 输出描述：
# 输出一个整数，表示最多可以成功装箱的货物数量。
# 如果没有任何一件货物可以被装箱，则输出
# 0 。
# 示例1
# 输入例子：
# 8
# 50
# 50
# 1
# 14
# 32
# 15
# 2
# 22
# 11
# 88
# 42
# 14
# 25
# 14
# 9
# 40
# 35
# 50
# 17
# 32
# 输出例子：
# 6
#
# def main():
#     # 读取集装箱数量
#     container_count = int(input())
#     # 读取集装箱载重
#     containers = list(map(int, input().split()))
#     # 读取货物数量
#     cargo_count = int(input())
#     # 读取货物重量
#     cargos = list(map(int, input().split()))
#
#     # 货物按重量升序排序
#     cargos.sort()
#     # 集装箱按载重升序排序
#     containers.sort()
#
#     cargo_index = 0  # 指向当前最轻的未装货物
#     total_loaded = 0
#
#     # 对每个集装箱，尽可能装入最轻的货物
#     for container_capacity in containers:
#         current_weight = 0
#         # 在当前集装箱中，从cargo_index开始装货物
#         while cargo_index < len(cargos) and current_weight + cargos[cargo_index] <= container_capacity:
#             current_weight += cargos[cargo_index]
#             cargo_index += 1
#             total_loaded += 1
#
#     print(total_loaded)
#
#
# if __name__ == "__main__":
#     main()
#
#
