#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 80 端口转到学习服务 127.0.0.1:8777。"""
import socket
import threading

LISTEN = ("0.0.0.0", 80)
TARGET = ("127.0.0.1", 8777)


def _pipe(src, dst):
    try:
        while True:
            data = src.recv(65536)
            if not data:
                break
            dst.sendall(data)
    except OSError:
        pass
    finally:
        for sock in (src, dst):
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass


def _nodelay(sock):
    try:
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
    except OSError:
        pass


def handle(client):
    upstream = None
    try:
        _nodelay(client)
        upstream = socket.create_connection(TARGET, timeout=10)
        _nodelay(upstream)
        upstream.settimeout(None)
        client.settimeout(None)
        back = threading.Thread(target=_pipe, args=(upstream, client), daemon=True)
        back.start()
        _pipe(client, upstream)
        back.join(timeout=2)
    except OSError:
        pass
    finally:
        for sock in (client, upstream):
            if sock is None:
                continue
            try:
                sock.close()
            except OSError:
                pass


def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(LISTEN)
    server.listen(128)
    print("forward 0.0.0.0:80 -> 127.0.0.1:8777", flush=True)
    while True:
        client, _addr = server.accept()
        threading.Thread(target=handle, args=(client,), daemon=True).start()


if __name__ == "__main__":
    main()
