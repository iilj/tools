import { SExpr } from '../lib/Language';
import { Parser } from '../lib/Parser';
import { Serializer } from './Serializer';

describe('serialize', (): void => {
    // 文字列定義
    test('should generate string definition statement conrrectly.', (): void => {
        const sampleInputString = 's = "abcabcbb"';
        const expr: SExpr = Parser.parse(sampleInputString);

        const serializer = new Serializer(false, 'normal');
        const result: string = serializer.serialize(expr);
        expect(result).toBe('string s = "abcabcbb";\n');
    });

    // vc<int> と int の定義
    test('should generate vector and int definition statements conrrectly.', (): void => {
        const sampleInputString = 'nums = [2,7,11,15], target = 9';
        const expr: SExpr = Parser.parse(sampleInputString);

        const serializer = new Serializer(false, 'normal');
        const result: string = serializer.serialize(expr);
        expect(result).toBe('vector<int> nums = {2, 7, 11, 15};\nint target = 9;\n');
    });

    // 負の int の定義
    // 出典：https://leetcode.com/contest/weekly-contest-279/problems/smallest-value-of-the-rearranged-number/
    test('should generate negative integer definition statements conrrectly.', (): void => {
        const sampleInputString = 'num = -7605';
        const expr: SExpr = Parser.parse(sampleInputString);

        const serializer = new Serializer(false, 'normal');
        const result: string = serializer.serialize(expr);
        expect(result).toBe('int num = -7605;\n');
    });

    // vc<vc<int>> の定義
    test('should generate 2D vector definition statement conrrectly.', (): void => {
        const sampleInputString = 'edges = [[1,2],[1,3],[1,4],[3,4],[4,5]]';
        const expr: SExpr = Parser.parse(sampleInputString);

        const serializer = new Serializer(false, 'normal');
        const result: string = serializer.serialize(expr);
        expect(result).toBe('vector<vector<int>> edges = {{1, 2}, {1, 3}, {1, 4}, {3, 4}, {4, 5}};\n');
    });

    // 空の1次元ベクトルの定義
    // 出典：https://leetcode.com/problems/merge-k-sorted-lists/
    test('should generate empty 1D vector definition statement conrrectly.', (): void => {
        const sampleInputString = 'lists = []';
        const expr: SExpr = Parser.parse(sampleInputString);

        const serializer = new Serializer(false, 'normal');
        const result: string = serializer.serialize(expr);
        expect(result).toBe('vector<unknown> lists = {};\n');
    });

    // 空の2次元ベクトルの定義
    // 出典：https://leetcode.com/problems/merge-k-sorted-lists/
    test('should generate empty 2D vector definition statement conrrectly.', (): void => {
        const sampleInputString = 'lists = [[]]';
        const expr: SExpr = Parser.parse(sampleInputString);

        const serializer = new Serializer(false, 'normal');
        const result: string = serializer.serialize(expr);
        expect(result).toBe('vector<vector<unknown>> lists = {{}};\n');
    });

    // Binary tree
    // 出典：https://leetcode.com/problems/invert-binary-tree/
    test('should generate binary tree definition statement conrrectly.', (): void => {
        const sampleInputString = 'root = [4,2,7,1,3,6,9]';
        const expr: SExpr = Parser.parse(sampleInputString);

        const serializer = new Serializer(false, 'binary_tree');
        const result: string = serializer.serialize(expr);
        expect(result).toBe(
            'vector<TreeNode *> nodes_root(7, nullptr);\n' +
                'nodes_root[6] = new TreeNode(9, nullptr, nullptr);\n' +
                'nodes_root[5] = new TreeNode(6, nullptr, nullptr);\n' +
                'nodes_root[4] = new TreeNode(3, nullptr, nullptr);\n' +
                'nodes_root[3] = new TreeNode(1, nullptr, nullptr);\n' +
                'nodes_root[2] = new TreeNode(7, nodes_root[5], nodes_root[6]);\n' +
                'nodes_root[1] = new TreeNode(2, nodes_root[3], nodes_root[4]);\n' +
                'nodes_root[0] = new TreeNode(4, nodes_root[1], nodes_root[2]);\n' +
                'TreeNode *root = nodes_root[0];\n' +
                '\n' +
                '\n' +
                'for (TreeNode *node : nodes_root) { // このブロックは最後に記述する\n' +
                '    if (node != nullptr) delete node;\n' +
                '}\n'
        );
    });

    // Linked list
    // 出典：https://leetcode.com/problems/odd-even-linked-list/
    test('should generate linked list definition statement conrrectly.', (): void => {
        const sampleInputString = 'head = [1,2,3,4,5]';
        const expr: SExpr = Parser.parse(sampleInputString);

        const serializer = new Serializer(false, 'linked_list');
        const result: string = serializer.serialize(expr);
        expect(result).toBe(
            'vector<ListNode *> nodes_head(5, nullptr);\n' +
                'nodes_head[4] = new ListNode(5);\n' +
                'nodes_head[3] = new ListNode(4, nodes_head[4]);\n' +
                'nodes_head[2] = new ListNode(3, nodes_head[3]);\n' +
                'nodes_head[1] = new ListNode(2, nodes_head[2]);\n' +
                'nodes_head[0] = new ListNode(1, nodes_head[1]);\n' +
                'ListNode *head = nodes_head[0];\n' +
                '\n' +
                '\n' +
                'for (ListNode *node : nodes_head) { // このブロックは最後に記述する\n' +
                '    if (node != nullptr) delete node;\n' +
                '}\n'
        );
    });

    // class メソッド呼び出し
    // 1行目にメソッド名，2行目に引数，3行目に戻り値
    // 出典：https://leetcode.com/contest/weekly-contest-279/problems/design-bitset/
    test('should generate class test statement conrrectly.', (): void => {
        const sampleInputString =
            '["Bitset", "fix", "fix", "flip", "all", "unfix", "flip", "one", "unfix", "count", "toString"]\n' +
            '[[5], [3], [1], [], [], [0], [], [], [0], [], []]\n' +
            '[null, null, null, null, false, null, null, true, null, 2, "01010"]';
        const expr: SExpr = Parser.parse(sampleInputString);

        const serializer = new Serializer(false, 'normal');
        const result: string = serializer.serialize(expr);
        expect(result).toBe(
            'Bitset obj(5);\n' +
                'obj.fix(3);\n' +
                'obj.fix(1);\n' +
                'obj.flip();\n' +
                'assert(obj.all() == false);\n' +
                'obj.unfix(0);\n' +
                'obj.flip();\n' +
                'assert(obj.one() == true);\n' +
                'obj.unfix(0);\n' +
                'assert(obj.count() == 2);\n' +
                'assert(obj.toString() == "01010");\n'
        );
    });
});
