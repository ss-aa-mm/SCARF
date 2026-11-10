"""
SCARF — interaction-level figure: carbon x performance, faceted by
tier, bubble size = total accumulated SCI.

Expects the raw multi-replication export shaped like:

{
  "interactions": {
    "<InteractionName>|<Tier>": [
        {"teads_sci": [...], "power_model_sci": [...],
         "embodied_sci": [...], "service_time": [...]},
        ... one dict per replication ...
    ],
    ...
  }
}

Run with: python interaction_figure.py <data.json> <output_basename>
"""

import json
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

NAME_COLORS = [
    "#0072B2", "#E69F00", "#009E73", "#D55E00",
    "#CC79A7", "#56B4E9", "#8B4513", "#7F7F7F",
]
MARKERS = ["o", "s", "^", "D", "v", "P", "X", "*"]

SIZE_MIN, SIZE_MAX = 40, 420
EDGE = "#1a1a1a"
MARKER_EDGE = "#1a1a1a"


def load_data(path):
    with open(path) as f:
        return json.load(f)
    return None


def pool(rep_list, key):
    out = []
    for rep in rep_list:
        out.extend(rep.get(key, []))
    return out


def summarize_interactions(raw):
    out = {}
    for key, rep_list in raw["interactions"].items():
        name, tier = key.split("|")
        sci = pool(rep_list, "teads_sci")
        times = pool(rep_list, "service_time")
        n = len(sci)
        avg_sci = sum(sci) / n if n else 0.0
        avg_time = sum(times) / len(times) if times else 0.0
        total_sci = sum(sci)
        out[key] = {
            "name": name, "tier": tier,
            "avg_sci": avg_sci, "avg_time": avg_time,
            "total_sci": total_sci, "n": n,
        }
    return out

def build_figure(summary, out_base):
    tiers = sorted({v["tier"] for v in summary.values()})
    names = sorted({v["name"] for v in summary.values()})
    name_color = {n: NAME_COLORS[i % len(NAME_COLORS)] for i, n in enumerate(names)}
    name_marker = {n: MARKERS[i % len(MARKERS)] for i, n in enumerate(names)}

    all_totals = [v["total_sci"] for v in summary.values()]
    lo, hi = min(all_totals), max(all_totals)

    def size_of(total):
        if hi == lo:
            return (SIZE_MIN + SIZE_MAX) / 2
        frac = (total - lo) / (hi - lo)
        return SIZE_MIN + frac * (SIZE_MAX - SIZE_MIN)

    fig, axes = plt.subplots(1, len(tiers), figsize=(7.2, 3.15), sharex=True, sharey=True)
    if len(tiers) == 1:
        axes = [axes]

    for ax, tier in zip(axes, tiers):
        entries = sorted(
            (v for v in summary.values() if v["tier"] == tier),
            key=lambda v: v["total_sci"], reverse=True,
        )
        for e in entries:
            ax.scatter(
                e["avg_sci"], e["avg_time"],
                s=size_of(e["total_sci"]),
                color=name_color[e["name"]],
                marker=name_marker[e["name"]],
                edgecolor=MARKER_EDGE, linewidth=0.5,
                alpha=0.85, zorder=3,
            )
        ax.set_title(tier, fontsize=12.5, pad=6)
        ax.grid(color="#eeeeee", linewidth=0.8, zorder=0)
        ax.set_axisbelow(True)
        for spine in ("top", "right"):
            ax.spines[spine].set_visible(False)
        ax.ticklabel_format(axis="x", style="sci", scilimits=(0, 0))
        ax.tick_params(axis='both', labelsize=11.5)

    axes[0].set_ylabel("Avg response time (ms)", fontsize=11.5)
    fig.supxlabel("Avg SCI per execution (gCO$_2$eq)", fontsize=11.5, y=0.225)

    name_handles = [
        Line2D([0], [0], marker=name_marker[n], color="none",
               markerfacecolor=name_color[n], markeredgecolor=EDGE,
               markersize=7, linewidth=0, label=n)
        for n in names
    ]

    ref_fracs = [0.15, 0.5, 0.9]
    ref_vals = [lo + f * (hi - lo) for f in ref_fracs]
    size_handles = [
        Line2D([0], [0], marker="o", color="none",
               markerfacecolor="#bbbbbb", markeredgecolor=EDGE,
               markersize=(size_of(v) ** 0.5) / 2, linewidth=0,
               label=f"{v:.1e} gCO$_2$eq")
        for v in ref_vals
    ]

    leg1 = fig.legend(handles=name_handles, loc="lower center", ncol=4,
                       bbox_to_anchor=(0.5, -0.02), frameon=False, fontsize=10.5,
                       title="Interaction", title_fontsize=11.5,
                       handletextpad=0.4, columnspacing=1.1)
    fig.add_artist(leg1)
    fig.legend(handles=size_handles, loc="lower center", ncol=3,
               bbox_to_anchor=(0.5, -0.24), frameon=False, fontsize=10.5,
               title="Bubble size = total accumulated SCI", title_fontsize=11.5,
               handletextpad=1.0, columnspacing=1.8, labelspacing=1.5)

    fig.subplots_adjust(left=0.10, right=0.98, top=0.86, bottom=0.42, wspace=0.08)

    fig.savefig(f"{out_base}.pdf", bbox_inches="tight")
    fig.savefig(f"{out_base}.png", bbox_inches="tight")
    print(f"Saved {out_base}.pdf/png")


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        raw_ = load_data(sys.argv[1])
        out_base_ = sys.argv[2]
        summary_ = summarize_interactions(raw_)
        build_figure(summary_, out_base_)
