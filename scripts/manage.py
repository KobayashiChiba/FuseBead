"""FuseBead 进程管理 — 前后端启动 / 停止 / 重启 / 状态
用法:
  python scripts/manage.py start [backend|frontend|all]
  python scripts/manage.py stop  [backend|frontend|all]
  python scripts/manage.py restart [backend|frontend|all]
  python scripts/manage.py status
"""
import sys, os, time, signal, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")

SERVICES = {
    "backend": {
        "dir": os.path.join(ROOT, "backend"),
        "cmd": [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8890"],
        "log": os.path.join(ROOT, "_uvicorn.log"),
        "pid_file": os.path.join(DATA_DIR, "backend.pid"),
        "port": 8890,
        "name": "后端 (uvicorn:8890)",
    },
    "frontend": {
        "dir": os.path.join(ROOT, "frontend"),
        "cmd": ["npm", "run", "dev"],
        "log": os.path.join(ROOT, "_vite.log"),
        "pid_file": os.path.join(DATA_DIR, "frontend.pid"),
        "port": 5173,
        "name": "前端 (Vite:5173)",
    },
}


def pid_alive(pid):
    try: os.kill(pid, 0); return True
    except (OSError, ProcessLookupError): return False


def find_by_port(port):
    try:
        r = subprocess.run(["netstat", "-ano"], capture_output=True, timeout=5)
        lines = r.stdout.decode("gbk", errors="replace").splitlines()
        for line in lines:
            if f":{port}" in line and "LISTENING" in line:
                return int(line.strip().split()[-1])
    except: pass
    return None


def do_start(svc):
    cfg = SERVICES[svc]
    if os.path.exists(cfg["pid_file"]):
        with open(cfg["pid_file"]) as f:
            pid = int(f.read().strip())
        if pid_alive(pid):
            print(f"⚠️  {cfg['name']} 已在运行 (PID {pid})")
            return True
        os.remove(cfg["pid_file"])

    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"🚀 启动 {cfg['name']} ...")
    with open(cfg["log"], "w") as log:
        proc = subprocess.Popen(cfg["cmd"], cwd=cfg["dir"], stdout=log, stderr=subprocess.STDOUT)
    pid = proc.pid
    with open(cfg["pid_file"], "w") as f:
        f.write(str(pid))

    time.sleep(2)
    if pid_alive(pid):
        print(f"✅ {cfg['name']} 已启动 (PID {pid})")
        return True
    else:
        print(f"❌ {cfg['name']} 启动失败，查看日志: {cfg['log']}")
        os.remove(cfg["pid_file"])
        return False


def do_stop(svc):
    cfg = SERVICES[svc]
    pid = None
    if os.path.exists(cfg["pid_file"]):
        with open(cfg["pid_file"]) as f:
            try: pid = int(f.read().strip())
            except ValueError: pass

    if pid is None or not pid_alive(pid):
        pid = find_by_port(cfg["port"])

    if pid is None:
        print(f"⚠️  {cfg['name']} 未在运行")
        if os.path.exists(cfg["pid_file"]):
            os.remove(cfg["pid_file"])
        return True

    print(f"🛑 停止 {cfg['name']} (PID {pid})...")
    try: os.kill(pid, signal.SIGTERM)
    except: pass

    for _ in range(20):
        if not pid_alive(pid):
            print(f"✅ {cfg['name']} 已停止")
            if os.path.exists(cfg["pid_file"]):
                os.remove(cfg["pid_file"])
            return True
        time.sleep(0.5)

    print(f"⚠️  进程未响应，强制终止...")
    try: os.kill(pid, signal.SIGKILL)
    except: pass
    time.sleep(1)
    if os.path.exists(cfg["pid_file"]):
        os.remove(cfg["pid_file"])
    return True


def do_status():
    print("═══ FuseBead 状态 ═══")
    for svc in SERVICES.values():
        pid = None
        if os.path.exists(svc["pid_file"]):
            with open(svc["pid_file"]) as f:
                try: pid = int(f.read().strip())
                except ValueError: pass
            if pid and pid_alive(pid):
                print(f"✅ {svc['name']} (PID {pid})")
                continue
        pid = find_by_port(svc["port"])
        if pid:
            print(f"✅ {svc['name']} (PID {pid}) — 非 manage.py 启动")
        else:
            print(f"❌ {svc['name']}")


def main():
    if len(sys.argv) < 2:
        print("用法: python scripts/manage.py [start|stop|restart|status] [backend|frontend|all]")
        print("示例:")
        print("  python scripts/manage.py start all       # 启动前后端")
        print("  python scripts/manage.py stop backend    # 停止后端")
        print("  python scripts/manage.py restart all     # 重启前后端")
        print("  python scripts/manage.py status          # 查看状态")
        return 1

    action = sys.argv[1]
    target = sys.argv[2] if len(sys.argv) > 2 else "all"

    if action == "status":
        do_status()
        return 0

    if target not in ("backend", "frontend", "all"):
        print(f"未知目标: {target}，可选 backend/frontend/all")
        return 1

    if action == "start":
        if target == "all":
            ok1 = do_start("backend")
            ok2 = do_start("frontend")
            return 0 if ok1 and ok2 else 1
        return 0 if do_start(target) else 1

    elif action == "stop":
        if target == "all":
            do_stop("frontend")
            do_stop("backend")
            return 0
        do_stop(target)
        return 0

    elif action == "restart":
        if target == "all":
            do_stop("frontend")
            do_stop("backend")
            time.sleep(1)
            ok1 = do_start("backend")
            ok2 = do_start("frontend")
            return 0 if ok1 and ok2 else 1
        do_stop(target)
        time.sleep(1)
        return 0 if do_start(target) else 1

    else:
        print(f"未知操作: {action}，可选 start/stop/restart/status")
        return 1


if __name__ == "__main__":
    sys.exit(main())
