# features/hot-desk.feature
# Source: le.ad/src/lib/desk.ts — claim, sweep, heartbeat, release, verdict, record.
# The page at https://james-gibson.github.io/le.ad/ is the reference implementation
# of this file; the constants it fixes are LEASE_MS = 90 seconds and MIN_RUNG = 1.
#
# le.ad introduces this isotope and proposes it for isotope/features/. The rule it
# adds to the lab is the one the lattice did not have: a connection point that is
# *held* needs a lease, and silence has to return the desk rather than leave a
# holder behind.
#
# 42i-marker: +42
@isotope @desk @lease
Feature: A desk is held by one live claim at a time
  As a seed that needs a connection point
  I want an empty desk that I can take and hold for a lease
  So that silence returns the desk to the row instead of leaving a stale holder

  Scenario: an unclaimed desk has no holder
    Given a desk that has received no claim
    When the desk is read
    Then the desk reports no holder
    And the desk is empty

  Scenario: absolute zero may not hold a desk
    Given an empty desk
    When a claim arrives at rung 0 with a distance of 0
    Then the claim is refused as rung-zero
    And the desk is still empty

  Scenario: a claim past the ceiling of its rung is refused
    Given an empty desk
    When a claim arrives at rung 2 with a distance of 74
    Then the claim is refused as drift
    And the desk is still empty

  Scenario: a claim that fits takes the desk
    Given an empty desk
    When a claim arrives at rung 2 with a distance of 31
    Then the claim is accepted
    And the holder is the seed that claimed it
    And the lease ends 90 seconds after the claim was issued

  Scenario: a second claim inside the lease is refused
    Given a desk held by a seed inside its lease
    When another seed claims the same desk
    Then the claim is refused as held
    And the holder is unchanged

  Scenario: a heartbeat from the holder extends the lease
    Given a desk held by a seed inside its lease
    When the holder sends a heartbeat
    Then the heartbeat is accepted
    And the lease ends 90 seconds after the heartbeat

  Scenario: a heartbeat from another seed is refused
    Given a desk held by a seed inside its lease
    When a different seed sends a heartbeat
    Then the heartbeat is refused as not-holder
    And the lease is unchanged

  Scenario: an expired lease returns the desk to the row
    Given a desk held by a seed
    When the desk is read 90 seconds after the claim was issued
    Then the desk reports no holder
    And the desk is empty

  Scenario: the holder may release the desk
    Given a desk held by a seed inside its lease
    When the holder releases the desk
    Then the release is accepted
    And the desk is empty before the lease would have ended

  Scenario: a release by another seed is refused
    Given a desk held by a seed inside its lease
    When a different seed releases the desk
    Then the release is refused as not-holder
    And the holder is unchanged

  Scenario: the record is the same for the same claim
    Given two desks that received the same claim
    When each desk is serialised to its record
    Then the two records are identical
    And neither record carries a lease deadline

  Scenario: a claim link decodes to the claim it encoded
    Given a claim at rung 3 with a distance of 96
    When the claim is encoded and decoded
    Then the decoded claim has the same seed
    And the decoded claim has the same rung and distance

  Scenario: an expired claim link is refused on arrival
    Given a claim link issued more than 90 seconds ago
    When the claim in the link is verified
    Then the claim is refused as stale
    And no desk is taken

  Scenario: claiming one desk leaves the rest of the row untouched
    Given a row of six empty desks
    When the first desk in the row is claimed
    Then that desk is held
    And the other five desks are empty
