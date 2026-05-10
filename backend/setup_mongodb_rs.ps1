# setup_mongodb_rs.ps1
# Run this script as Administrator to enable Replica Set on local MongoDB

$configPath = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg"

if (-Not (Test-Path $configPath)) {
    Write-Host "Error: MongoDB config not found at $configPath" -ForegroundColor Red
    exit 1
}

Write-Host "Reading MongoDB config..."
$content = Get-Content $configPath

if ($content -match "replSetName: rs0") {
    Write-Host "Replica Set is already configured in mongod.cfg." -ForegroundColor Yellow
} else {
    Write-Host "Configuring Replica Set in mongod.cfg..."
    # Uncomment replication section and add replSetName
    $content = $content -replace "#replication:", "replication:`r`n  replSetName: rs0"
    Set-Content $configPath $content
    Write-Host "Updated mongod.cfg successfully." -ForegroundColor Green
}

Write-Host "Restarting MongoDB service..."
Restart-Service MongoDB -ErrorAction SilentlyContinue
if ($?) {
    Write-Host "Service restarted successfully." -ForegroundColor Green
} else {
    Write-Host "Failed to restart service. Please ensure you are running as Administrator." -ForegroundColor Red
    exit 1
}

Write-Host "Waiting for MongoDB to start..."
Start-Sleep -Seconds 5

Write-Host "Initiating Replica Set..."
# Try to run mongosh or npx mongosh
try {
    mongosh --eval "rs.initiate()"
} catch {
    Write-Host "mongosh not found. Trying npx mongosh..."
    npx mongosh --eval "rs.initiate()"
}

Write-Host "Done! You can now use MongoDB with Prisma." -ForegroundColor Green
