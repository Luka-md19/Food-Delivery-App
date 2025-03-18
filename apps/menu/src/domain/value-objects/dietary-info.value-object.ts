export class DietaryInfo {
    private readonly _vegetarian: boolean;
    private readonly _vegan: boolean;
    private readonly _glutenFree: boolean;
    private readonly _nutFree: boolean;
  
    constructor(
      vegetarian: boolean = false,
      vegan: boolean = false,
      glutenFree: boolean = false,
      nutFree: boolean = false
    ) {
      this._vegetarian = vegetarian;
      this._vegan = vegan;
      this._glutenFree = glutenFree;
      this._nutFree = nutFree;
    }
  
    get vegetarian(): boolean {
      return this._vegetarian;
    }
  
    get vegan(): boolean {
      return this._vegan;
    }
  
    get glutenFree(): boolean {
      return this._glutenFree;
    }
  
    get nutFree(): boolean {
      return this._nutFree;
    }
  
    // Factory method to create from persistence
    public static fromPersistence(data: any): DietaryInfo {
      return new DietaryInfo(
        data.vegetarian || false,
        data.vegan || false,
        data.glutenFree || false,
        data.nutFree || false
      );
    }
  
    // Convert to persistence format
    public toPersistence(): any {
      return {
        vegetarian: this._vegetarian,
        vegan: this._vegan,
        glutenFree: this._glutenFree,
        nutFree: this._nutFree
      };
    }
  
    // Value objects should be immutable, so we need methods to create new instances
    public with(changes: {
      vegetarian?: boolean;
      vegan?: boolean;
      glutenFree?: boolean;
      nutFree?: boolean;
    }): DietaryInfo {
      return new DietaryInfo(
        changes.vegetarian !== undefined ? changes.vegetarian : this._vegetarian,
        changes.vegan !== undefined ? changes.vegan : this._vegan,
        changes.glutenFree !== undefined ? changes.glutenFree : this._glutenFree,
        changes.nutFree !== undefined ? changes.nutFree : this._nutFree
      );
    }
  
    // Value objects should implement equals method
    public equals(other: DietaryInfo): boolean {
      if (!(other instanceof DietaryInfo)) {
        return false;
      }
  
      return (
        this._vegetarian === other._vegetarian &&
        this._vegan === other._vegan &&
        this._glutenFree === other._glutenFree &&
        this._nutFree === other._nutFree
      );
    }
  }