<?php

header("Content-type:application/json");

$pgsqlOptions = "host='localhost' dbname='geog5871' user='geog5871student' password='Geibeu9b'";
$dbconn = pg_connect($pgsqlOptions) or die ('Connection failure');

// Build WHERE conditions
$whereConditions = array();

// No city/region filter - query all data
$whereClause = "";
if (count($whereConditions) > 0) {
	$whereClause = "WHERE " . implode(" AND ", $whereConditions);
}

// Main query: fetch all tweets
$query = "SELECT oid, body, latitude, longitude FROM tweets " . $whereClause . " ORDER BY oid";
$result = pg_query($dbconn, $query) or die (json_encode(array("error" => "Query failed: ".pg_last_error())));

$tweetData = array();

while ($row = pg_fetch_array($result, null, PGSQL_ASSOC)) {
	$tweetData[] = array(
		"id" => $row["oid"],
		"body" => $row["body"],
		"lat" => (float)$row["latitude"],
		"lon" => (float)$row["longitude"]
	);
}

// Statistics query: hotspot area analysis (by grid)
$statsQuery = "
	SELECT 
		ROUND(latitude::numeric, 1) as lat_grid,
		ROUND(longitude::numeric, 1) as lon_grid,
		COUNT(*) as tweet_count,
		AVG(latitude) as avg_lat,
		AVG(longitude) as avg_lon
	FROM tweets
	" . $whereClause . "
	GROUP BY ROUND(latitude::numeric, 1), ROUND(longitude::numeric, 1)
	ORDER BY tweet_count DESC
	LIMIT 10
";

$statsResult = pg_query($dbconn, $statsQuery);
if (!$statsResult) {
	$statsResult = null;
	$hotspots = array();
} else {
	$hotspots = array();
	while ($row = pg_fetch_array($statsResult, null, PGSQL_ASSOC)) {
		$hotspots[] = array(
			"lat" => (float)$row["avg_lat"],
			"lon" => (float)$row["avg_lon"],
			"count" => (int)$row["tweet_count"],
			"lat_grid" => (float)$row["lat_grid"],
			"lon_grid" => (float)$row["lon_grid"]
		);
	}
}

// Statistics summary
$summaryQuery = "
	SELECT 
		COUNT(*) as total_tweets
	FROM tweets
	" . $whereClause;

$summaryResult = pg_query($dbconn, $summaryQuery);
$summary = pg_fetch_array($summaryResult, null, PGSQL_ASSOC);

// Return combined data
$response = array(
	"tweets" => $tweetData,
	"hotspots" => $hotspots,
	"summary" => array(
		"total_tweets" => (int)$summary["total_tweets"],
		"area_count" => count($hotspots),
		"earliest_date" => "",
		"latest_date" => ""
	)
);

echo json_encode($response);
pg_close($dbconn);

?>
