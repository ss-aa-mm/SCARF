"""
SCARF — device-level figure: SCI composition (operational/embodied) +
utilization composition (per-service, core-proportional) for 2-3 devices.

Expects a JSON structure shaped like:

{
  "devices": {
    "<device_name>": {
      "total_cores": 4,
      "total_operational_sci": 1.83e-2,
      "total_embodied_sci": 4.10e-3,
      "vms": {
        "<service_name>": {"allocated_cores": 2, "mean_utilization": 0.5},
        ...
      }
    },
    ...
  }
}

This mirrors what's derivable from SCARF_DATA.devices in results_v2.js:
  total_cores          <- rep0.total_cores
  vms[name].allocated_cores      <- rep0.vms[name].allocated_cores
  vms[name].mean_utilization     <- mean(rep.vms[name].average_utilization)
  total_operational_sci / total_embodied_sci <- same split already computed
      in renderDeviceImpact() / the deviceRows table logic (totalOp / totalEmbodied)

Run with: python device_figure.py <data.json> <output_basename>
Falls back to bundled example data (3-device Pi cluster) if no args given.
"""

import json
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from matplotlib.lines import Line2D

# ─── Colorblind-safe, grayscale-degrading palette (Okabe-Ito derived) ───────
COL_OPERATIONAL = "#0D9488"   # teal
COL_EMBODIED    = "#4A5568"   # anthracite
COL_USED        = "#2563EB"   # royal blue
COL_IDLE        = "#D9D9D9"   # light grey, dotted hatch (within-VM idle)
COL_UNALLOC     = "#F2F2F2"   # near-white grey, cross-hatch + dashed edge

HATCH_EMBODIED  = "//"
HATCH_IDLE      = "...."
HATCH_UNALLOC   = "xx"

EDGE = "#1a1a1a"
DIVIDER_EDGE = "#4A5568"
DIVIDER_LW = 0.9


def load_data(path):
    with open(path) as f:
        return json.load(f)


def summarize_devices(raw):
    """
    Collapse a raw multi-replication export (raw["devices"][name] = [rep0, rep1, ...])
    into the flat per-device summary build_figure() expects. Mirrors the aggregation
    already done in results_v2.js (timeSeriesMean / totalOp / per-VM utilSeries).
    """
    out = {}
    for dev_name, rep_list in raw["devices"].items():
        rep0 = rep_list[0]
        total_cores = rep0["total_cores"]
        n_intervals = len(rep0["timestamps"])

        # elementwise mean of average_teads_sci across replications, then summed
        mean_series = [
            sum(rep["average_teads_sci"][i] for rep in rep_list) / len(rep_list)
            for i in range(n_intervals)
        ]
        total_sci = sum(mean_series)
        total_embodied = rep0["embodied_sci_per_interval"] * n_intervals
        total_operational = total_sci - total_embodied

        vms = {}
        for vm_name, vm0 in rep0["vms"].items():
            pooled_util = [
                u for rep in rep_list for u in rep["vms"][vm_name]["average_utilization"]
            ]
            mean_util = sum(pooled_util) / len(pooled_util) if pooled_util else 0.0
            vms[vm_name] = {
                "allocated_cores": vm0["allocated_cores"],
                "mean_utilization": mean_util,
            }

        out[dev_name] = {
            "total_cores": total_cores,
            "total_operational_sci": total_operational,
            "total_embodied_sci": total_embodied,
            "vms": vms,
        }
    return {"devices": out}


EXAMPLE_DATA = {
    "devices": {
        "RPi4-A (4-core)": {
            "total_cores": 4,
            "total_operational_sci": 1.83e-2,
            "total_embodied_sci": 6.70e-3,
            "vms": {
                "CustomersService": {"allocated_cores": 2, "mean_utilization": 0.62},
                "VetsService":      {"allocated_cores": 1, "mean_utilization": 0.41},
                "VisitsService":    {"allocated_cores": 1, "mean_utilization": 0.35},
            },
        },
        "RPi4-B (3-core)": {
            "total_cores": 3,
            "total_operational_sci": 1.21e-2,
            "total_embodied_sci": 5.02e-3,
            "vms": {
                "ApiGateway": {"allocated_cores": 3, "mean_utilization": 0.50},
            },
        },
        "RPi4-C (2-core)": {
            "total_cores": 2,
            "total_operational_sci": 6.4e-3,
            "total_embodied_sci": 3.35e-3,
            "vms": {
                "ConfigServer":    {"allocated_cores": 1, "mean_utilization": 0.28},
                "DiscoveryServer": {"allocated_cores": 1, "mean_utilization": 0.33},
            },
        },
    }
}


def build_figure(data, out_base):
    devices = data["devices"]
    dev_names = list(devices.keys())
    n = len(dev_names)

    fig_h = 0.9 * n + 2.3
    fig, (ax_sci, ax_util) = plt.subplots(
        1, 2, figsize=(7.0, fig_h), sharey=True,
        gridspec_kw={"width_ratios": [1.05, 1.0], "wspace": 0.06},
    )

    y = list(range(n))
    bar_h = 0.62

    # ── Panel A: SCI composition (operational + embodied), stacked ──────────
    op_vals  = [devices[d]["total_operational_sci"] for d in dev_names]
    emb_vals = [devices[d]["total_embodied_sci"] for d in dev_names]

    ax_sci.barh(y, op_vals, height=bar_h, color=COL_OPERATIONAL,
                edgecolor=EDGE, linewidth=0.6, label="Operational SCI", zorder=3)
    ax_sci.barh(y, emb_vals, height=bar_h, left=op_vals, color=COL_EMBODIED,
                edgecolor=EDGE, linewidth=0.6, hatch=HATCH_EMBODIED,
                label="Embodied SCI", zorder=3)

    ax_sci.set_xlabel("SCI (gCO$_2$eq)", fontsize=11.5)
    ax_sci.invert_xaxis()  # grows leftward, mirrors the utilization panel outward from the device labels
    ax_sci.set_yticks(y)
    ax_sci.set_yticklabels(dev_names)
    ax_sci.grid(axis="x", color="#eeeeee", linewidth=0.8, zorder=0)
    ax_sci.tick_params(axis='both', which='both', length=0, labelsize=11.5)
    ax_sci.set_axisbelow(True)
    for spine in ("top", "right", "left"):
        ax_sci.spines[spine].set_visible(False)

    # ── Panel B: utilization composition, core-proportional, per-service ────
    max_cores = max(devices[d]["total_cores"] for d in dev_names)

    legend_used_drawn = legend_idle_drawn = legend_unalloc_drawn = False

    for yi, d in enumerate(dev_names):
        dev = devices[d]
        total_cores = dev["total_cores"]
        vms = dev["vms"]
        vm_names = list(vms.keys())

        cursor = 0.0
        for vm_name in vm_names:
            vm = vms[vm_name]
            cores = vm["allocated_cores"]
            util = vm["mean_utilization"]
            used_len = cores * util
            idle_len = cores * (1 - util)

            ax_util.add_patch(Rectangle(
                (cursor, yi - bar_h / 2), used_len, bar_h,
                facecolor=COL_USED, edgecolor=EDGE, linewidth=0.6, zorder=3,
                label="Used" if not legend_used_drawn else None,
            ))
            legend_used_drawn = True

            ax_util.add_patch(Rectangle(
                (cursor + used_len, yi - bar_h / 2), idle_len, bar_h,
                facecolor=COL_IDLE, edgecolor=EDGE, linewidth=0.6,
                hatch=HATCH_IDLE, zorder=3,
                label="Idle (allocated, unused)" if not legend_idle_drawn else None,
            ))
            legend_idle_drawn = True

            cursor += cores
            # bold divider between distinct services (not after the very last one)
            '''if vm_name != vm_names[-1]:
                ax_util.plot([cursor, cursor], [yi - bar_h / 2, yi + bar_h / 2],
                             color=DIVIDER_EDGE, linewidth=DIVIDER_LW, zorder=4,
                             solid_capstyle="butt", linestyle="--")'''

            # Draw tiny external notches extending just outside the bar limits 
            # to delineate service divisions without cutting through your core color blocks
            if vm_name != vm_names[-1]:
                ax_util.plot([cursor, cursor], [yi - bar_h / 2, yi - bar_h / 2 - 0.05],
                             color="#1a1a1a", linewidth=0.6, zorder=4, clip_on=False)
                ax_util.plot([cursor, cursor], [yi + bar_h / 2, yi + bar_h / 2 + 0.05],
                             color="#1a1a1a", linewidth=0.6, zorder=4, clip_on=False)


        unalloc = total_cores - cursor
        if unalloc > 1e-9:
            ax_util.add_patch(Rectangle(
                (cursor, yi - bar_h / 2), unalloc, bar_h,
                facecolor=COL_UNALLOC, edgecolor=EDGE, linewidth=0.8,
                linestyle=(0, (3, 2)), hatch=HATCH_UNALLOC, zorder=3,
                label="Unallocated" if not legend_unalloc_drawn else None,
            ))
            legend_unalloc_drawn = True

    ax_util.set_xlim(0, max_cores)
    ax_util.set_xlabel("CPU cores", fontsize=11.5)
    ax_util.set_xticks(range(0, max_cores + 1))
    ax_util.grid(axis="x", color="#eeeeee", linewidth=0.8, zorder=0)
    ax_util.tick_params(axis='both', which='both', length=0, labelsize=11.5)
    ax_util.set_axisbelow(True)
    for spine in ("top", "right", "left"):
        ax_util.spines[spine].set_visible(False)

    # divider markers in the legend to explain the service-boundary convention
    '''divider_handle = Line2D([0], [0], color=DIVIDER_EDGE, linewidth=DIVIDER_LW,
                             label="Service boundary", linestyle="--")'''
    divider_handle = Line2D([0], [0], color=EDGE, marker="|", linestyle="None",
                        markersize=8, label="Service boundary")


    handles_a, labels_a = ax_sci.get_legend_handles_labels()
    handles_b, labels_b = ax_util.get_legend_handles_labels()
    all_handles = handles_a + handles_b + [divider_handle]
    all_labels = labels_a + labels_b + ["Service boundary"]

    fig.legend(all_handles, all_labels, loc="lower center", ncol=3,
               bbox_to_anchor=(0.5, -0.02), frameon=False, fontsize=11.5,
               handletextpad=0.5, columnspacing=1.3)

    ax_sci.set_title("(a) SCI composition", fontsize=12.5, loc="center", pad=8)
    ax_util.set_title("(b) Core utilization by service", fontsize=12.5, loc="center", pad=8)

    fig.subplots_adjust(left=0.16, right=0.98, top=0.90, bottom=0.26)

    fig.savefig(f"{out_base}.pdf", bbox_inches="tight")
    fig.savefig(f"{out_base}.png", bbox_inches="tight")
    print(f"Saved {out_base}.pdf/png")


if __name__ == "__main__":
    if len(sys.argv) >= 3:
        raw = load_data(sys.argv[1])
        data = summarize_devices(raw)
        out_base = sys.argv[2]
    else:
        data = EXAMPLE_DATA
        out_base = "example"
    build_figure(data, out_base)

