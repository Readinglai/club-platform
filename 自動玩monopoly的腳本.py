"""
Monopoly 自動點擊腳本
功能：每 5 秒自動點擊一次 Roll 和 Votekick 按鈕
順序：Roll → 等 1 秒 → Votekick → 等 5 秒 → 重複
使用 Python 內建的 ctypes 模組呼叫 Windows API，不需安裝任何第三方套件
"""

import ctypes  # 用於呼叫 Windows 原生 API
import time    # 用於計時與等待


# ──────────────────────────────────────────────
# 常數定義（Windows mouse_event 事件旗標）
# ──────────────────────────────────────────────
MOUSEEVENTF_LEFTDOWN = 0x0002   # 按下滑鼠左鍵
MOUSEEVENTF_LEFTUP   = 0x0004   # 放開滑鼠左鍵

# 載入 Windows user32.dll，提供游標與滑鼠控制功能
user32 = ctypes.windll.user32


# ──────────────────────────────────────────────
# 按鍵座標設定（由 PowerShell 游標偵測工具取得）
# ──────────────────────────────────────────────
ROLL_X,     ROLL_Y     = 790,  462   # Roll 骰子按鈕的螢幕座標
VOTEKICK_X, VOTEKICK_Y = 1166, 281   # Votekick 按鈕的螢幕座標

# 時間間隔設定
DELAY_BETWEEN_CLICKS = 1   # Roll 和 Votekick 之間的間隔（秒）
DELAY_EACH_ROUND     = 5   # 每一輪結束後等待的時間（秒）


def click(x, y):
    """
    將游標移動到指定座標並執行左鍵點擊

    參數:
        x (int): 目標點的水平座標（像素）
        y (int): 目標點的垂直座標（像素）
    """
    user32.SetCursorPos(x, y)                              # 移動游標到 (x, y)
    time.sleep(0.05)                                       # 等游標確實到位
    user32.mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)  # 按下左鍵
    user32.mouse_event(MOUSEEVENTF_LEFTUP,   0, 0, 0, 0)  # 放開左鍵


def main():
    """
    主迴圈：持續執行點擊任務直到使用者按下 Ctrl+C
    """
    print("=== Monopoly 自動點擊腳本 ===")
    print(f"Roll     座標: ({ROLL_X}, {ROLL_Y})")
    print(f"Votekick 座標: ({VOTEKICK_X}, {VOTEKICK_Y})")
    print(f"執行順序: Roll → 等 {DELAY_BETWEEN_CLICKS} 秒 → Votekick → 等 {DELAY_EACH_ROUND} 秒")
    print("按 Ctrl+C 停止腳本")
    print("─" * 40)

    round_count = 0

    try:
        while True:
            round_count += 1
            print(f"\n第 {round_count} 輪")

            # 步驟一：點擊 Roll
            click(ROLL_X, ROLL_Y)
            print(f"  [1] Roll 已點擊 ({ROLL_X}, {ROLL_Y})")

            # 步驟二：等待 1 秒
            time.sleep(DELAY_BETWEEN_CLICKS)

            # 步驟三：點擊 Votekick
            click(VOTEKICK_X, VOTEKICK_Y)
            print(f"  [2] Votekick 已點擊 ({VOTEKICK_X}, {VOTEKICK_Y})")

            # 步驟四：等待 5 秒後進行下一輪
            print(f"  → 等待 {DELAY_EACH_ROUND} 秒後繼續...")
            time.sleep(DELAY_EACH_ROUND)

    except KeyboardInterrupt:
        # 使用者按下 Ctrl+C，正常結束程式
        print(f"\n\n腳本已停止，共執行 {round_count} 輪。")


# 程式進入點
if __name__ == "__main__":
    main()