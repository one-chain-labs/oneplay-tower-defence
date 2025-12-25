#!/bin/bash

# Test script to verify tower burn mechanism

echo "🔍 Checking contract deployment..."
echo ""
echo "Package ID: 0xfdec11104d2e3231fbd4406751cbd57d8147ffd3f3e598f4e2ae0b09d224c961"
echo "Game State: 0x7e8c26af167e8991b456da581e822b232eb1297d9d705e588c39bd8b92d859dc"
echo ""

# Check if package exists
one client object 0xfdec11104d2e3231fbd4406751cbd57d8147ffd3f3e598f4e2ae0b09d224c961

echo ""
echo "✅ If you see package details above, the contract is deployed correctly"
echo ""
echo "📝 To test tower burn:"
echo "1. Mint a tower with the NEW contract"
echo "2. Note the tower's Object ID"
echo "3. Play game and fail (0 waves)"
echo "4. Check if tower still exists:"
echo "   one client object <TOWER_OBJECT_ID>"
echo ""
echo "If tower is burned, you should see 'ObjectNotFound' error"
