import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { orderBy } from 'lodash';
import { Card } from '../../fixtures/Card';
import MoveType from '../../../../utils/MoveType.json';
import GamePhase from '../../../../utils/GamePhase.json';
import { HAND_LIMIT } from '../../../../utils/GameConstants.json';
import { mainPhase } from '../../fixtures/gameStates/ai/mainPhase';
import { mainPhase2MinimaxPenalties } from '../../fixtures/gameStates/ai/minimax/mainPhase2MinimaxPenalties';
import { mainPhase3AdditionalPenalties } from '../../fixtures/gameStates/ai/minimax/mainPhase3AdditionalPenalties';
import { resolvingSevenPhase1 } from '../../fixtures/gameStates/ai/resolvingSevenPhase1';
import { resolvingSevenPhase2 } from '../../fixtures/gameStates/ai/resolvingSevenPhase2';
import { resolvingSevenPhase3 } from '../../fixtures/gameStates/ai/resolvingSevenPhase3DoubleJack';
import { resolvingFivePhase1HasMultipleCardsInHand } from '../../fixtures/gameStates/ai/resolvingFivePhase1HasMultipleCardsInHand';
import { resolvingFivePhase2HasOneCardInHand } from '../../fixtures/gameStates/ai/resolvingFivePhase2HasOneCardInHand';
import { resolvingFivePhase3HasNoCardsInHand } from '../../fixtures/gameStates/ai/resolvingFivePhase3HasNoCardsInHand';
import { resolvingFourRevealPhase } from '../../fixtures/gameStates/ai/resolvingFourRevealPhase';
import { resolvingFourDiscardPhase } from '../../fixtures/gameStates/ai/resolvingFourDiscardPhase';
import { counteringPhase1AbleToCounter } from '../../fixtures/gameStates/ai/counteringPhase1AbleToCounter';
import { counteringPhase2CannotCounter } from '../../fixtures/gameStates/ai/counteringPhase2CannotCounter';

const fixturesForLegalMoves = [
  mainPhase,
  resolvingSevenPhase1,
  resolvingSevenPhase2,
  resolvingSevenPhase3,
  resolvingFivePhase1HasMultipleCardsInHand,
  resolvingFivePhase2HasOneCardInHand,
  resolvingFivePhase3HasNoCardsInHand,
  resolvingFourRevealPhase,
  resolvingFourDiscardPhase,
  counteringPhase1AbleToCounter,
  counteringPhase2CannotCounter,
];

const fixturesForMinimax = [
  mainPhase2MinimaxPenalties,
  mainPhase3AdditionalPenalties,
];

let getMoveBodiesForMoveType;
let getLegalMoves;
let scoreGameState;
let getMinimaxScore;
describe('AI Move Validation', () => {
  beforeAll(() => {
    ({ getMoveBodiesForMoveType } = sails.helpers.gameStates.ai);
    ({ getLegalMoves } = sails.helpers.gameStates.ai);
    ({ scoreGameState } = sails.helpers.gameStates.ai.minimax);
    ({ getMinimaxScore } = sails.helpers.gameStates.ai.minimax);
  });

  beforeEach(async () => {
    await sails.helpers.wipeDatabase();
  });

  describe('Minimax', () => {
    describe('scoreGameState()', ()=> {
      it('Evaluates score for main phase state for p0', () => {
        const score = scoreGameState(mainPhase.gameState, 0);
        expect(score).to.eq(mainPhase.minimaxScore);
      });

      it('Evaluates score for main phase 2 for p0', () => {
        const score = scoreGameState(mainPhase2MinimaxPenalties.gameState, 0);
        expect(score).to.eq(mainPhase2MinimaxPenalties.baseScore);
      });

      describe.each(fixturesForMinimax)('Scoring GameStates for $name', (fixture) => {
        it.each(fixture.movesAndScores)('$description', ({ move, score }) => {
          const { execute } = sails.helpers.gameStates.moves[move.moveType];
          const resultingState = execute(fixture.gameState, move, fixture.playedBy, [ fixture.gameState ]);
          const resultingScore = scoreGameState(resultingState, fixture.playedBy);
          expect(resultingScore).to.eq(score);
        });
      });
    });

    describe('getMinimaxScore()', () => {
      it('Gets minimax score at depth 0 for main phase state for p0', () => {
        const score = getMinimaxScore(mainPhase.gameState, 0, 0, []);
        expect(score).to.eq(mainPhase.minimaxScore);
      });

    });
  });

  describe('getMoveBodiesForMoveType() for DISCARD_TO_HAND_LIMIT', () => {
    // Two cards over the hand limit, whatever HAND_LIMIT is set to
    const hand = Object.values(Card).slice(0, HAND_LIMIT + 2);
    const gameState = {
      p0: { hand, points: [], faceCards: [] },
      p1: { hand: [], points: [], faceCards: [] },
      deck: [],
      scrap: [],
      turn: 0,
      phase: GamePhase.DISCARDING_TO_HAND_LIMIT,
    };

    it('creates a move body for every way to discard down to HAND_LIMIT', () => {
      const moveBodies = getMoveBodiesForMoveType(gameState, 0, MoveType.DISCARD_TO_HAND_LIMIT);
      // C(HAND_LIMIT + 2, 2) pairs of cards
      expect(moveBodies).to.have.length((HAND_LIMIT + 2) * (HAND_LIMIT + 1) / 2);
    });

    it('only creates move bodies the server accepts', () => {
      const { validate } = sails.helpers.gameStates.moves.discardToHandLimit;
      const moveBodies = getMoveBodiesForMoveType(gameState, 0, MoveType.DISCARD_TO_HAND_LIMIT);
      moveBodies.forEach((moveBody) => {
        expect(() => validate(gameState, moveBody, 0, [])).not.to.throw();
      });
    });

    it('creates no move bodies when the hand is at the limit', () => {
      const atLimit = { ...gameState, p0: { ...gameState.p0, hand: hand.slice(0, HAND_LIMIT) } };
      expect(getMoveBodiesForMoveType(atLimit, 0, MoveType.DISCARD_TO_HAND_LIMIT)).to.deep.eq([]);
    });
  });

  describe.each(fixturesForLegalMoves)('AI moves in $name', (fixture) => {
    describe(`getMoveBodiesForMoveType() for ${fixture.name}`, () => {
      it.each(fixture.moveBodiesByType)('creates move bodies for $moveType', (testCase) => {
        const moveBodies = getMoveBodiesForMoveType(fixture.gameState, fixture.playedBy, testCase.moveType);
        expect(moveBodies).to.deep.eq(testCase.moves);
      });
    });

    describe(`getLegalMoves() for ${fixture.name}`, () => {
      it(`getLegalMoves() for ${fixture.name}`, () => {
        const legalMoves = orderBy(
          getLegalMoves(fixture.gameState, fixture.playedBy, [ fixture.gameState ]), [ 'moveType', 'cardId', 'targetId' ]
        );

        const expectedLegalMoves = orderBy(fixture.validMoveBodies.map((moveBody) => {
          const { execute } = sails.helpers.gameStates.moves[moveBody.moveType];
          return execute(fixture.gameState, moveBody, fixture.playedBy, [ fixture.gameState ]);
        }), [ 'moveType', 'cardId', 'targetId' ]);

        expect(legalMoves).to.deep.eq(expectedLegalMoves);
      });
    });
  });
});
