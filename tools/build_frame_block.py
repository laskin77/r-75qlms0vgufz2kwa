#!/usr/bin/env python3
"""Rebuild review/frame-block.js from data/chinese/*.json + optional records.json.
Usage: python3 tools/build_frame_block.py [--records /path/to/records.json]
5:30 國文出題 routine 在寫入當日 data/chinese/YYYY-MM-DD.json 並更新 records assigned 後應執行本腳本再 commit。
"""
import json, re, argparse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STORE_DEFAULT = Path("/cursor/stores/store-ee0cc95b-cb36-4940-b81d-5d7d631df1ae/records.json")
OOR = {"h8-004", "h8-037"}

def norm(s):
    return re.sub(r'[\s「」『』【】（）\(\)\[\]：:，,。．\.、？\?！!；;]', '', s or '')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--records", default=str(STORE_DEFAULT))
    args = ap.parse_args()
    qjs = (ROOT / "review/questions.js").read_text()
    m = re.match(r"window\.CR_DATA=(\{.*\});?\s*$", qjs, re.S)
    DATA = json.loads(m.group(1))
    BY = {q["id"]: q for q in DATA["questions"]}
    blocked = set(OOR)
    stem_block = set()
    rp = Path(args.records)
    if rp.exists():
        rec = json.loads(rp.read_text())
        for ids in rec.get("assigned", {}).values():
            blocked |= set(ids)
        for e in rec.get("done", []):
            blocked.add(e["id"])
        for e in rec.get("wrong", []):
            blocked.add(e["id"])
    for p in sorted((ROOT / "data/chinese").glob("20*.json")):
        if not re.match(r"\d{4}-\d{2}-\d{2}\.json$", p.name):
            continue
        data = json.loads(p.read_text())
        for q in data.get("questions", []):
            if str(q.get("id", "")).startswith("ST-"):
                continue
            items = q.get("items") or q.get("questions") if (q.get("type") == "group" or q.get("items")) else None
            if items is None:
                items = [q]
            for x in items:
                iid = x.get("id")
                if not iid:
                    continue
                blocked.add(iid)
                st = norm(x.get("question") or "")[:70]
                if st:
                    stem_block.add(st)
    for iid in list(blocked):
        if iid in BY and BY[iid].get("question"):
            stem_block.add(norm(BY[iid]["question"])[:70])
    for q in DATA["questions"]:
        if q.get("topic") != "閱讀" or q.get("type") == "passage":
            continue
        st = norm(q.get("question") or "")[:70]
        if st and st in stem_block:
            blocked.add(q["id"])
    body = {
        "generated": __import__("datetime").datetime.now().strftime("%Y-%m-%d"),
        "note": "框題閱讀排除清單。出題後執行: python3 tools/build_frame_block.py",
        "ids": sorted(blocked),
        "stems": sorted(s for s in stem_block if s),
    }
    out = ROOT / "review/frame-block.js"
    out.write_text("window.CR_FRAME_BLOCK=" + json.dumps(body, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(f"wrote {out} ids={len(body['ids'])} stems={len(body['stems'])}")

if __name__ == "__main__":
    main()
