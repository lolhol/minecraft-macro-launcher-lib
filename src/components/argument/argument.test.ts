import { Argument } from './argument';
import { Rule, RuleAction } from '../rule/rule';

describe('Argument', () => {
  describe('#from', () => {
    it('should resolve string argument', () => {
      const arg = '--demo';
      const { value, rules } = Argument.from(arg);

      expect(value).toEqual([arg]);
      expect(rules).toEqual([]);
    });

    it('should resolve normal argument', () => {
      const value = '--demo';
      const arg = Argument.from({
        rules: [{ action: RuleAction.ALLOW }],
        value,
      });

      expect(arg.value).toEqual([value]);
      expect(arg.rules[0].action).toBe('allow');
      expect(arg.rules[0].os).toEqual({});
      expect(arg.rules[0].features).toEqual({});
    });

    it('should resolve string argument with two substrings', () => {
      const args = ['--username', '${auth_player_name}'];
      const { value, rules } = Argument.from(args.join(' '));

      expect(value[0]).toBe(args[0]);
      expect(value[1]).toBe(args[1]);

      expect(rules).toEqual([]);
    });

    // TODO it('should extends child argument rules with parent argument', () => { });
  });

  describe('#isApplicable', () => {
    it('should be able to check platform and features', () => {
      const platform = { arch: 'x64' };
      const features = { has_custom_resolution: true };

      const argument1 = new Argument(
        ['--width', '${resolution_width}', '--height', '${resolution_height}'],
        [new Rule(RuleAction.ALLOW, {}, features)]
      );

      const argument2 = new Argument(
        ['-Xss1M'],
        [new Rule(RuleAction.ALLOW, platform, {})]
      );

      expect(argument1.isApplicable(platform, features)).toBeTruthy();
      expect(argument2.isApplicable(platform, features)).toBeTruthy();
    });
  });

  describe('#rules', () => {
    it('should add new rule', () => {
      const arg = new Argument(['--demo']);
      arg.rules.push(new Rule());
      expect(arg.rules.length).toBe(1);
    });
  });
});
