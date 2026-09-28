import json
from pathlib import Path

gt_data = json.load(open('data/ground_truth.json', encoding='utf-8'))
gt = {g['alert_id']: g for g in gt_data}
summary = json.load(open('results/eval_summary.json', encoding='utf-8'))
mem_results = json.load(open('results/eval_memory.json', encoding='utf-8'))
nomem_results = json.load(open('results/eval_nomemory.json', encoding='utf-8'))
sample_ids = json.load(open('results/sample_ids.json', encoding='utf-8'))['sample_ids']

print("=" * 80)
print("PART 2: NO-MEMORY 38 BENIGN ESCALATIONS")
print("=" * 80)
benign_escalations = []
forced_by_rule_count = 0

for aid in sample_ids:
    g = gt.get(aid, {})
    if g.get('variant') == 'recurring_benign':
        res = nomem_results.get(aid, {})
        state = str(res.get('state', '')).lower()
        if state in ['yellow', 'red']:
            benign_escalations.append((aid, res, g))

print(f"Total benign escalated in No-Memory: {len(benign_escalations)} / 40\n")
for aid, res, g in benign_escalations:
    state = res.get('state')
    llm_res = res.get('llm_result') or {}
    llm_model = llm_res.get('model_used')
    llm_state = llm_res.get('state')
    safety_overrides = res.get('safety_overrides', [])
    reasons = res.get('reasons', [])
    
    is_rule = (llm_model == 'fallback_rule') or any('rule' in str(s).lower() or 'forced' in str(s).lower() for s in safety_overrides)
    if is_rule:
        forced_by_rule_count += 1
        
    print(f"Alert: {aid} | Final State: {state} | LLM Model: {llm_model} (LLM State: {llm_state}) | Safety Overrides: {safety_overrides}")

print(f"\nSummary of Part 2: Out of 38 escalated benign alerts in No-Memory:")
print(f"  - Forced by fallback/rule: {forced_by_rule_count}")
print(f"  - Classified yellow/red by LLM: {len(benign_escalations) - forced_by_rule_count}")

print("\n" + "=" * 80)
print("PART 3: 11 MEMORY-MODE FALSE GREENS ANALYSIS")
print("=" * 80)
false_greens = summary['metrics']['memory_mode']['false_greens']
print(f"Total False Greens in Memory Mode: {len(false_greens)}\n")

for item in false_greens:
    aid = item['alert_id']
    res = mem_results.get(aid, {})
    gt_item = gt.get(aid, {})
    
    best_match_id = res.get('best_match_id')
    best_match = res.get('best_match') or {}
    bm_gt = gt.get(best_match_id, {})
    
    bm_outcome = best_match.get('outcome')
    bm_verdict = best_match.get('verdict')
    is_bm_benign = ('benign' in str(bm_outcome).lower()) or ('benign' in str(bm_verdict).lower())
    
    diffs = best_match.get('differences', [])
    key_diff_count = best_match.get('key_difference_count', 0)
    
    bm_variant = bm_gt.get('variant', 'N/A')
    bm_kind = bm_gt.get('kind', 'N/A')
    bm_scenario = bm_gt.get('scenario', 'N/A')
    
    print("-" * 80)
    print(f"Alert ID: {aid}")
    print(f"  Ground Truth: Scenario='{gt_item.get('scenario')}', Variant='{gt_item.get('variant')}', Should Escalate={gt_item.get('should_escalate')}")
    print(f"  Ground Truth Context Differences: {gt_item.get('context_differences')}")
    print(f"  Best Match ID: {best_match_id}")
    print(f"  Best Match History Variant: '{bm_variant}', Kind: '{bm_kind}', Scenario: '{bm_scenario}'")
    print(f"  Best Match Outcome: \"{bm_outcome}\" (Verdict: {bm_verdict}) -> Is Benign: {is_bm_benign}")
    print(f"  Agent Key Difference Count: {key_diff_count}")
    print(f"  Agent Differences List ({len(diffs)} items):")
    if diffs:
        for d in diffs:
            print(f"    * Signal: {d.get('signal')} | Past: {d.get('past')} vs Current: {d.get('current')}")
    else:
        print("    * (None - Exact Match detected by compare_context)")
    explanation = str(res.get('explanation', '')).encode('ascii', 'backslashreplace').decode('ascii')
    print(f"  LLM Explanation: {explanation}")
    print(f"  Safety Overrides: {res.get('safety_overrides')}")

