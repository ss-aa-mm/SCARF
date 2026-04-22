package se.lnu.scarf;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.extern.slf4j.Slf4j;
import tech.tablesaw.aggregate.AggregateFunctions;
import tech.tablesaw.api.*;
import tech.tablesaw.selection.Selection;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
public class GridCarbonIntensityDataGenerator {

    private static final String GCI_FOLDER = "src/main/resources/gci/";
    private static final String OUTPUT_FILE = "target/classes/static/gci.json";
    private static final ObjectMapper MAPPER = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);

    public static void main(String[] args) {
        Map<String, Map<String, double[]>> data = new HashMap<>();
        List<String[]> zones = List.of(
                new String[]{"CA-ON", "ca_central_1"},
                new String[]{"BR-CS", "sa_east_1"},
                new String[]{"US-CAL-CISO", "us_west_1"},
                new String[]{"AU-NSW", "ap_southeast_2"},
                new String[]{"DE", "eu_central_1"},
                new String[]{"US-MIDA-PJM", "us_east_2"},
                new String[]{"JP-TK", "ap_northeast_1"},
                new String[]{"US-NW-PACW", "us_west_2"},
                new String[]{"US-MIDA-PJM", "us_east_1"},
                new String[]{"IE", "eu_west_1"}
        );
        for (String[] z : zones) {
            data.put(z[1], processRegion(z[0]));
        }
        try {
            MAPPER.writeValue(new File(OUTPUT_FILE), data);
            log.info("Successfully created {}", OUTPUT_FILE);
        } catch (IOException e) {
            log.error("Failed to write JSON output", e);
        }
    }

    static Map<String, double[]> processRegion(String zone) {
        String filename = "snapshots_2026-02-10_" + zone + "-2025-hourly.csv";
        Table df = Table.read().csv(GCI_FOLDER + filename);
        log.info("Processing {}", filename);

        DateTimeColumn dtCol = df.dateTimeColumn("Datetime (UTC)");
        StringColumn quartileCol = StringColumn.create("Quartile",
                dtCol.asList().stream().map(dt -> getQuartile(dt.getMonthValue())).toArray(String[]::new));
        IntColumn hourCol = IntColumn.create("Hour",
                dtCol.asList().stream().mapToInt(LocalDateTime::getHour).toArray());
        DoubleColumn gciCol = df.doubleColumn("Carbon intensity gCO₂eq/kWh (Life cycle)").copy();
        gciCol.setName("GCI");

        Table work = Table.create("work", quartileCol, hourCol, gciCol);

        Table grouped = work.summarize("GCI", AggregateFunctions.median)
                .by("Quartile", "Hour");
        grouped.column("Median [GCI]").setName("GCI");

        List<String> quartiles = grouped.stringColumn("Quartile")
                .unique().asList().stream().sorted().toList();
        List<Integer> hours = grouped.intColumn("Hour")
                .unique().asList().stream().sorted().toList();

        Table wide = Table.create("wide");
        StringColumn qCol = StringColumn.create("Quartile", quartiles);
        wide.addColumns(qCol);

        for (int hour : hours) {
            String colName = String.format("utc%02d:00", hour);
            double[] vals = new double[quartiles.size()];
            for (int qi = 0; qi < quartiles.size(); qi++) {
                String q = quartiles.get(qi);
                Selection sel = grouped.stringColumn("Quartile").isEqualTo(q)
                        .and(grouped.intColumn("Hour").isEqualTo(hour));
                Table cell = grouped.where(sel);
                vals[qi] = cell.isEmpty() ? Double.NaN : cell.doubleColumn("GCI").getDouble(0);
            }
            wide.addColumns(DoubleColumn.create(colName, vals));
        }

        String[] yearlyQuartile = {"Yearly"};
        Table yearlyRow = Table.create("yearly", StringColumn.create("Quartile", yearlyQuartile));
        for (int hour : hours) {
            String colName = String.format("utc%02d:00", hour);
            double med = wide.doubleColumn(colName).median();
            yearlyRow.addColumns(DoubleColumn.create(colName, med));
        }
        wide = wide.append(yearlyRow);

        for (int hour : hours) {
            String colName = String.format("utc%02d:00", hour);
            DoubleColumn col = wide.doubleColumn(colName);
            for (int i = 0; i < col.size(); i++) {
                if (!col.isMissing(i)) {
                    col.set(i, Math.round(col.getDouble(i) * 100.0) / 100.0);
                }
            }
        }

        Map<String, double[]> regionResult = new HashMap<>();
        for (Row row : wide) {
            String qName = row.getString("Quartile");
            double[] hourlyArray = new double[24];
            for (int qi = 0; qi < 24; qi++) {
                hourlyArray[qi] = row.getDouble(String.format("utc%02d:00",qi));
            }
            regionResult.put(qName, hourlyArray);
        }
        return regionResult;
    }

    static String getQuartile(int month) {
        return "Q" + ((month - 1) / 3 + 1);
    }
}