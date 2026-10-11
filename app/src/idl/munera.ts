/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/munera.json`.
 */
export type Munera = {
  "address": "48KEXpcdXgpeqTaZW2whYrWz823yewZxAr3x4cYh4S3W",
  "metadata": {
    "name": "munera",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Munera - Enter the arena. Earn your reward. Solana escrow for content bounties."
  },
  "instructions": [
    {
      "name": "approveSubmission",
      "docs": [
        "Sponsor approves a Pending submission; the reward is paid from the vault to the",
        "creator's ATA (created on demand, sponsor pays rent) in the same transaction."
      ],
      "discriminator": [
        154,
        76,
        116,
        120,
        143,
        128,
        16,
        205
      ],
      "accounts": [
        {
          "name": "sponsor",
          "docs": [
            "Pays rent for the creator ATA if it must be created."
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "sponsor"
              },
              {
                "kind": "account",
                "path": "bounty.bounty_id",
                "account": "bounty"
              }
            ]
          },
          "relations": [
            "submission"
          ]
        },
        {
          "name": "submission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  98,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "creator",
          "relations": [
            "submission"
          ]
        },
        {
          "name": "mint",
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              }
            ]
          }
        },
        {
          "name": "creatorAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createBounty",
      "docs": [
        "Creates the Bounty PDA + vault and escrows `reward_per_winner * max_winners`",
        "from the sponsor's token account into the vault."
      ],
      "discriminator": [
        122,
        90,
        14,
        143,
        8,
        125,
        200,
        2
      ],
      "accounts": [
        {
          "name": "sponsor",
          "writable": true,
          "signer": true
        },
        {
          "name": "mint"
        },
        {
          "name": "bounty",
          "docs": [
            "seeds = [b\"bounty\", sponsor, bounty_id le]"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "sponsor"
              },
              {
                "kind": "arg",
                "path": "bountyId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "seeds = [b\"vault\", bounty]; authority = bounty PDA"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              }
            ]
          }
        },
        {
          "name": "sponsorAta",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bountyId",
          "type": "u64"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "rewardPerWinner",
          "type": "u64"
        },
        {
          "name": "maxWinners",
          "type": "u16"
        },
        {
          "name": "deadline",
          "type": "i64"
        }
      ]
    },
    {
      "name": "reclaimUnspent",
      "docs": [
        "After the deadline the sponsor withdraws the remaining vault balance and the",
        "bounty is Closed (a second call fails with `BountyClosed`)."
      ],
      "discriminator": [
        162,
        159,
        113,
        162,
        117,
        162,
        90,
        99
      ],
      "accounts": [
        {
          "name": "sponsor",
          "signer": true,
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "sponsor"
              },
              {
                "kind": "account",
                "path": "bounty.bounty_id",
                "account": "bounty"
              }
            ]
          }
        },
        {
          "name": "mint",
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              }
            ]
          }
        },
        {
          "name": "sponsorAta",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "rejectSubmission",
      "docs": [
        "Sponsor rejects a Pending submission."
      ],
      "discriminator": [
        2,
        92,
        1,
        81,
        148,
        156,
        6,
        160
      ],
      "accounts": [
        {
          "name": "sponsor",
          "signer": true,
          "relations": [
            "bounty"
          ]
        },
        {
          "name": "bounty",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "sponsor"
              },
              {
                "kind": "account",
                "path": "bounty.bounty_id",
                "account": "bounty"
              }
            ]
          },
          "relations": [
            "submission"
          ]
        },
        {
          "name": "submission",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  98,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              },
              {
                "kind": "account",
                "path": "submission.creator",
                "account": "submission"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "submitClip",
      "docs": [
        "A creator submits a link. Only while the bounty is Open and before the deadline."
      ],
      "discriminator": [
        252,
        133,
        240,
        239,
        176,
        239,
        79,
        79
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bounty.sponsor",
                "account": "bounty"
              },
              {
                "kind": "account",
                "path": "bounty.bounty_id",
                "account": "bounty"
              }
            ]
          }
        },
        {
          "name": "submission",
          "docs": [
            "seeds = [b\"submission\", bounty, creator] -> one per creator per bounty"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  117,
                  98,
                  109,
                  105,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "bounty"
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "link",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bounty",
      "discriminator": [
        237,
        16,
        105,
        198,
        19,
        69,
        242,
        234
      ]
    },
    {
      "name": "submission",
      "discriminator": [
        58,
        194,
        159,
        158,
        75,
        102,
        178,
        197
      ]
    }
  ],
  "events": [
    {
      "name": "bountyCreated",
      "discriminator": [
        68,
        252,
        247,
        196,
        154,
        247,
        130,
        49
      ]
    },
    {
      "name": "payoutEvent",
      "discriminator": [
        84,
        234,
        195,
        72,
        143,
        79,
        70,
        82
      ]
    },
    {
      "name": "reclaimEvent",
      "discriminator": [
        39,
        141,
        238,
        11,
        117,
        49,
        186,
        87
      ]
    },
    {
      "name": "rejectEvent",
      "discriminator": [
        192,
        82,
        231,
        32,
        161,
        225,
        157,
        75
      ]
    },
    {
      "name": "submissionCreated",
      "discriminator": [
        27,
        207,
        175,
        100,
        160,
        225,
        121,
        79
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidReward",
      "msg": "Reward per winner must be greater than zero"
    },
    {
      "code": 6001,
      "name": "invalidMaxWinners",
      "msg": "Max winners must be greater than zero"
    },
    {
      "code": 6002,
      "name": "deadlineInPast",
      "msg": "Deadline must be in the future"
    },
    {
      "code": 6003,
      "name": "titleTooLong",
      "msg": "Title must be 1-64 bytes"
    },
    {
      "code": 6004,
      "name": "descriptionTooLong",
      "msg": "Description must be at most 280 bytes"
    },
    {
      "code": 6005,
      "name": "linkTooLong",
      "msg": "Link must be 1-200 bytes"
    },
    {
      "code": 6006,
      "name": "mathOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6007,
      "name": "unauthorized",
      "msg": "Only the bounty sponsor can do this"
    },
    {
      "code": 6008,
      "name": "bountyClosed",
      "msg": "Bounty is closed"
    },
    {
      "code": 6009,
      "name": "deadlinePassed",
      "msg": "Submission deadline has passed"
    },
    {
      "code": 6010,
      "name": "deadlineNotReached",
      "msg": "Deadline has not been reached yet"
    },
    {
      "code": 6011,
      "name": "submissionNotPending",
      "msg": "Submission is not pending"
    },
    {
      "code": 6012,
      "name": "maxWinnersReached",
      "msg": "Maximum number of winners already paid"
    }
  ],
  "types": [
    {
      "name": "bounty",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sponsor",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "rewardPerWinner",
            "type": "u64"
          },
          {
            "name": "maxWinners",
            "type": "u16"
          },
          {
            "name": "paidCount",
            "type": "u16"
          },
          {
            "name": "submissionCount",
            "type": "u32"
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "bountyStatus"
              }
            }
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          },
          {
            "name": "bountyId",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "bountyCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bounty",
            "type": "pubkey"
          },
          {
            "name": "sponsor",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "bountyId",
            "type": "u64"
          },
          {
            "name": "rewardPerWinner",
            "type": "u64"
          },
          {
            "name": "maxWinners",
            "type": "u16"
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "totalEscrowed",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "bountyStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "closed"
          }
        ]
      }
    },
    {
      "name": "payoutEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bounty",
            "type": "pubkey"
          },
          {
            "name": "submission",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "paidCount",
            "type": "u16"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "reclaimEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bounty",
            "type": "pubkey"
          },
          {
            "name": "sponsor",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "rejectEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bounty",
            "type": "pubkey"
          },
          {
            "name": "submission",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "submission",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bounty",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "link",
            "type": "string"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "submissionStatus"
              }
            }
          },
          {
            "name": "paidAmount",
            "type": "u64"
          },
          {
            "name": "paidAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "submissionCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bounty",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "submission",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "submissionStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "approved"
          },
          {
            "name": "rejected"
          }
        ]
      }
    }
  ]
};
