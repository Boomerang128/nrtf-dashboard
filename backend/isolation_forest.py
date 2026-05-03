import random
import math

class IsolationForest:
    def __init__(self, n_trees=100, sample_size=256):
        self.n_trees = n_trees
        self.sample_size = sample_size
        self.trees = []

    def anomaly_score(self, x):
        if not self.trees:
            return 0.5
        
        path_lengths = [self._path_length(x, tree) for tree in self.trees]
        avg_path = sum(path_lengths) / len(path_lengths)
        
        # Normalize score between 0 and 1
        # c(n) is the average path length of unsuccessful search in BST
        c_n = 2 * (math.log(self.sample_size - 1) + 0.5772156649) - (2 * (self.sample_size - 1) / self.sample_size)
        score = 2 ** -(avg_path / c_n)
        return score

    def _path_length(self, x, node, current_depth=0):
        if 'value' not in node: # Leaf
            return current_depth + self._c_factor(node['size'])
        
        attr = node['attr']
        if x[attr] < node['value']:
            return self._path_length(x, node['left'], current_depth + 1)
        else:
            return self._path_length(x, node['right'], current_depth + 1)

    def _c_factor(self, n):
        if n <= 1: return 0
        return 2 * (math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n)

    @classmethod
    def from_dict(cls, data):
        forest = cls(n_trees=data['n_trees'], sample_size=data['sample_size'])
        forest.trees = data['trees']
        return forest

    def to_dict(self):
        return {
            'n_trees': self.n_trees,
            'sample_size': self.sample_size,
            'trees': self.trees
        }
